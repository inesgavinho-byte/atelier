"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { AIMessage } from "@/lib/ai/types";
import { runtime } from "@/lib/ai-runtime/runtime";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";
import { getArtifactsForInitiative, getDecisions } from "@/lib/mission";
import {
  getCanonicalChat,
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
 * The single canonical chat for a workspace (compat shim while workspace_chats
 * still exists — ADR-0004). Finds the earliest project-less chat or creates one.
 */
async function ensureCanonicalChat(
  sb: SupabaseClient,
  workspaceId: string,
  workspaceName: string | undefined
): Promise<string | null> {
  // Same selection the page uses, so reads and writes hit the same chat.
  const existing = await getCanonicalChat(workspaceId);
  if (existing) return existing.id;

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

/**
 * Build the leading Council system prompt: persona + compressed workspace
 * memory + the workspace's live active decisions and artifacts. The Knowledge
 * Library principles still travel via the runtime's own base prompt.
 */
function councilSystemMessage(
  workspaceName: string | undefined,
  ctx: WorkspaceContext | null,
  decisions: { title: string; status: string }[],
  artifacts: { title: string; kind: string }[]
): string {
  const parts: string[] = [
    `És o Council do ATELIER — o parceiro de pensamento e trabalho de Inês Gavinho. Este é o workspace ${workspaceName ?? "(sem nome)"}.`,
    "Responde em português europeu, com rigor e concisão. Nunca menciones a tua arquitectura interna (modos, sessões, modelos ou providers) — responde de forma natural, como uma conversa contínua que se lembra do contexto.",
  ];
  if (ctx?.summary.trim()) {
    parts.push(`## Memória comprimida do workspace\n${ctx.summary.trim()}`);
  }
  if (decisions.length) {
    parts.push(
      "## Decisões activas\n" +
        decisions.map((d) => `- ${d.title} — ${d.status}`).join("\n")
    );
  }
  if (artifacts.length) {
    parts.push(
      "## Artefactos\n" +
        artifacts.map((a) => `- ${a.title} (${a.kind})`).join("\n")
    );
  }
  if (ctx?.lessons?.length) {
    const lessons = ctx.lessons.map((l) =>
      typeof l === "string" ? l : JSON.stringify(l)
    );
    parts.push("## Lições aprendidas\n" + lessons.map((l) => `- ${l}`).join("\n"));
  }
  return parts.join("\n\n");
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
): Promise<{
  ok: boolean;
  text?: string;
  content?: string;
  model?: string;
  provider?: string;
  taskType?: string;
  error?: string;
}> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "Mensagem vazia." };

  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase não configurado." };

  await hydrateCredentialOverrides();

  const ws = await getWorkspace(workspaceId);
  const chatId = await ensureCanonicalChat(sb, workspaceId, ws?.name);
  if (!chatId) return { ok: false, error: "Não foi possível abrir a conversa." };

  // Compressed memory + the workspace's live active decisions and artifacts.
  const [ctx, allDecisions, artifacts] = await Promise.all([
    getWorkspaceContext(workspaceId),
    getDecisions().catch(() => []),
    getArtifactsForInitiative(workspaceId).catch(() => []),
  ]);
  const ctxVersion = ctx?.version ?? null;
  const activeDecisions = allDecisions
    .filter(
      (d) =>
        d.workspaceId === workspaceId &&
        d.status !== "aprovada" &&
        d.status !== "rejeitada"
    )
    .map((d) => ({ title: d.title, status: d.status }));
  const artifactList = artifacts.map((a) => ({ title: a.title, kind: a.kind }));

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
    .slice(-30)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const system = councilSystemMessage(
    ws?.name,
    ctx,
    activeDecisions,
    artifactList
  );
  const messages: AIMessage[] = [
    { role: "system", content: system },
    ...thread,
  ];

  const result = await runtime.run({
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
    task_type: result.taskType,
    tokens: result.tokens ?? null,
    latency_ms: result.latencyMs,
    context_version: ctxVersion,
  });
  await sb.from("workspace_chats").update({ updated_at: now() }).eq("id", chatId);

  revalidatePath(`/workspaces/${workspaceId}`);
  return {
    ok: true,
    text: result.text,
    content: result.text,
    model: result.model,
    provider: result.provider,
    taskType: result.taskType,
  };
}
