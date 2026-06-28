"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { gateway } from "@/lib/ai/gateway";
import type { AIMessage, ProviderId } from "@/lib/ai/types";
import { runtime } from "@/lib/ai-runtime/runtime";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";
import { getArtifactsForInitiative, getDecisions } from "@/lib/mission";
import {
  getMessages,
  getWorkspace,
  getWorkspaceContext,
  type WorkspaceContext,
} from "@/lib/workspaces";

const now = () => new Date().toISOString();

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
    `És o Council do ATELIER — um sistema de agentes que apoia o pensamento e trabalho de Inês Gavinho. Este é o workspace ${workspaceName ?? "(sem nome)"}.`,
    "Responde em português europeu, com rigor e concisão. O contexto pertence ao ATELIER; o provider é apenas o motor de execução.",
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
  error?: string;
}> {
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
  return {
    ok: true,
    text: result.text,
    content: result.text,
    model: result.model,
    provider: result.provider,
  };
}
