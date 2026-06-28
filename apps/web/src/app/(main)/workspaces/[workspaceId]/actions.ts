"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { gateway } from "@/lib/ai/gateway";
import type { AIMessage, ProviderId } from "@/lib/ai/types";
import { runtime } from "@/lib/ai-runtime/runtime";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";
import {
  getMessages,
  getWorkspace,
  getWorkspaceContext,
  type WorkspaceContext,
} from "@/lib/workspaces";
import {
  getRepoOverview,
  isValidRepo,
  type RepoOverview,
} from "@/lib/github";

const now = () => new Date().toISOString();

/* ── GitHub per workspace ──────────────────────────────────────────────────── */

/** Persist a workspace's associated GitHub repo ("owner/repo"). */
export async function setWorkspaceGithubRepo(
  workspaceId: string,
  repo: string
): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const clean = repo.trim();
  if (clean && !isValidRepo(clean)) {
    return { ok: false, message: 'Formato inválido — usa "owner/repo".' };
  }

  const { error } = await sb
    .from("workspaces")
    .update({ github_repo: clean || null, updated_at: now() })
    .eq("id", workspaceId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/workspaces/${workspaceId}`);
  return {
    ok: true,
    message: clean ? "Repositório ligado." : "Repositório removido.",
  };
}

/**
 * Live overview (PRs, commits, CI) for a workspace's configured repo. Reads the
 * repo server-side from the workspace row, so the client cannot point our token
 * at an arbitrary repository. Returns null when none is configured / no token.
 */
export async function getWorkspaceRepoOverview(
  workspaceId: string
): Promise<RepoOverview | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("workspaces")
    .select("github_repo")
    .eq("id", workspaceId)
    .maybeSingle();
  const repo = data?.github_repo as string | null | undefined;
  if (!repo) return null;
  return getRepoOverview(repo);
}

/**
 * The Council's provider choice (ADR-0004): the user never picks a model. We
 * take the first available provider in a fixed preference order — provider-
 * agnostic, decided server-side. A richer cost/task scoring is future work.
 */
const COUNCIL_ORDER: ProviderId[] = ["claude", "openai", "perplexity"];
function chooseProvider(): ProviderId | null {
  const avail = new Map(gateway.availability().map((a) => [a.id, a.available]));
  for (const id of COUNCIL_ORDER) if (avail.get(id)) return id;
  return null;
}

/**
 * The single canonical chat for a workspace (compat shim while workspace_chats
 * still exists — ADR-0004). Finds the earliest project-less chat or creates one.
 */
async function ensureCanonicalChat(
  sb: SupabaseClient,
  workspaceId: string,
  workspaceName: string | undefined
): Promise<string | null> {
  const { data: existing } = await sb
    .from("workspace_chats")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("project_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await sb
    .from("workspace_chats")
    .insert({
      workspace_id: workspaceId,
      title: workspaceName || "Conversa",
      provider: "ATELIER",
      mode: "livre",
    })
    .select("id")
    .single();
  return error ? null : (data.id as string);
}

/** Render the compressed workspace memory as a system message (or null). */
function contextSystemMessage(ctx: WorkspaceContext | null): string | null {
  if (!ctx) return null;
  const parts: string[] = [];
  if (ctx.summary.trim()) {
    parts.push(`## Memória do workspace\n${ctx.summary.trim()}`);
  }
  const list = (label: string, arr: unknown[]) => {
    if (Array.isArray(arr) && arr.length) {
      const lines = arr.map(
        (x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`
      );
      parts.push(`## ${label}\n${lines.join("\n")}`);
    }
  };
  list("Decisões", ctx.decisions);
  list("Artefactos", ctx.artifacts);
  list("Lições aprendidas", ctx.lessons);
  return parts.length ? parts.join("\n\n") : null;
}

/**
 * Send a message in a workspace's continuous chat (ADR-0004). Persists the user
 * turn, builds the system prompt (ATELIER identity + compressed workspace
 * context) plus a sliding window of recent turns, runs it through the runtime
 * (the Council picks the provider — never the user), and stores the reply.
 */
export async function sendWorkspaceMessage(
  workspaceId: string,
  content: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "Mensagem vazia." };

  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase não configurado." };

  await hydrateCredentialOverrides();
  const provider = chooseProvider();
  if (!provider) {
    return {
      ok: false,
      error: "Nenhum provider disponível. Configura uma chave em Ecossistema.",
    };
  }

  const ws = await getWorkspace(workspaceId);
  const chatId = await ensureCanonicalChat(sb, workspaceId, ws?.name);
  if (!chatId) return { ok: false, error: "Não foi possível abrir a conversa." };

  const ctx = await getWorkspaceContext(workspaceId);
  const ctxVersion = ctx?.version ?? null;

  // Persist the user turn first so it survives a failed model call.
  await sb.from("workspace_messages").insert({
    chat_id: chatId,
    role: "user",
    content: trimmed,
    context_version: ctxVersion,
  });

  // Sliding window of recent turns (includes the message just stored).
  const thread = (await getMessages(chatId))
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-20)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const ctxMsg = contextSystemMessage(ctx);
  const messages: AIMessage[] = ctxMsg
    ? [{ role: "system", content: ctxMsg }, ...thread]
    : thread;

  const result = await runtime.run({
    provider,
    workspaceName: ws?.name,
    messages,
  });

  if (!result.ok) {
    revalidatePath(`/workspaces/${workspaceId}`);
    return { ok: false, error: result.error ?? "Falha na execução." };
  }

  await sb.from("workspace_messages").insert({
    chat_id: chatId,
    role: "assistant",
    content: result.text ?? "",
    provider: result.provider,
    model: result.model,
    tokens: result.tokens ?? null,
    latency_ms: result.latencyMs,
    context_version: ctxVersion,
  });
  await sb.from("workspace_chats").update({ updated_at: now() }).eq("id", chatId);

  revalidatePath(`/workspaces/${workspaceId}`);
  return { ok: true, text: result.text };
}
