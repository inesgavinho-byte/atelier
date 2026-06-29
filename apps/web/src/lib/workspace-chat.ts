import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { AIMessage } from "@/lib/ai/types";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";
import { getArtifactsForInitiative, getDecisions } from "@/lib/mission";
import {
  getCanonicalChat,
  getMessages,
  getProject,
  getWorkspace,
  getWorkspaceContext,
  type WorkspaceContext,
} from "@/lib/workspaces";

/**
 * ATELIER — shared workspace-chat plumbing (ADR-0004).
 *
 * One implementation of "prepare a turn" (persist the user message, build the
 * Council system prompt + recent thread) and "persist the assistant turn",
 * reused by both the blocking send action and the streaming route so they can
 * never drift apart.
 */

const now = () => new Date().toISOString();

/** The canonical chat for a workspace/project — earliest match, or created. */
async function ensureCanonicalChat(
  sb: SupabaseClient,
  workspaceId: string,
  title: string | undefined,
  projectId?: string
): Promise<string | null> {
  const existing = await getCanonicalChat(workspaceId, projectId);
  if (existing) return existing.id;
  const { data, error } = await sb
    .from("workspace_chats")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId || null,
      title: title || "Conversa",
      provider: "ATELIER",
      mode: "livre",
    })
    .select("id")
    .single();
  return error ? null : (data.id as string);
}

/** The leading Council system prompt: persona + compressed memory + live state. */
export function councilSystemMessage(
  workspaceName: string | undefined,
  ctx: WorkspaceContext | null,
  decisions: { title: string; status: string }[],
  artifacts: { title: string; kind: string }[],
  project?: { name: string; ctx: WorkspaceContext | null }
): string {
  const place = project
    ? `Estás no projecto ${project.name} do workspace ${workspaceName ?? "(sem nome)"}.`
    : `Este é o workspace ${workspaceName ?? "(sem nome)"}.`;
  const parts: string[] = [
    `És o Council do ATELIER — o parceiro de pensamento e trabalho de Inês Gavinho. ${place}`,
    "Responde em português europeu, com rigor e concisão. Nunca menciones a tua arquitectura interna (modos, sessões, modelos ou providers) — responde de forma natural, como uma conversa contínua que se lembra do contexto.",
  ];
  if (ctx?.summary.trim()) {
    parts.push(`## Memória comprimida do workspace\n${ctx.summary.trim()}`);
  }
  if (project?.ctx?.summary.trim()) {
    parts.push(
      `## Memória comprimida do projecto ${project.name}\n${project.ctx.summary.trim()}`
    );
  }
  if (decisions.length) {
    parts.push(
      "## Decisões activas\n" +
        decisions.map((d) => `- ${d.title} — ${d.status}`).join("\n")
    );
  }
  if (artifacts.length) {
    parts.push(
      "## Artefactos\n" + artifacts.map((a) => `- ${a.title} (${a.kind})`).join("\n")
    );
  }
  const allLessons = [
    ...(ctx?.lessons ?? []),
    ...(project?.ctx?.lessons ?? []),
  ].map((l) => (typeof l === "string" ? l : JSON.stringify(l)));
  if (allLessons.length) {
    parts.push("## Lições aprendidas\n" + allLessons.map((l) => `- ${l}`).join("\n"));
  }
  return parts.join("\n\n");
}

export interface PreparedTurn {
  ok: boolean;
  error?: string;
  chatId?: string;
  workspaceName?: string;
  projectName?: string;
  /** Council system message + a sliding window of recent turns. */
  messages?: AIMessage[];
  ctxVersion?: number | null;
}

/**
 * Persist the user message and assemble the request: hydrate stored credentials,
 * resolve the workspace/project, ensure the canonical chat, and build the
 * Council system prompt plus the recent thread.
 */
export async function prepareWorkspaceTurn(
  workspaceId: string,
  content: string,
  projectId?: string
): Promise<PreparedTurn> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "Mensagem vazia." };

  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase não configurado." };

  await hydrateCredentialOverrides();

  const ws = await getWorkspace(workspaceId);
  const project = projectId ? await getProject(projectId) : undefined;
  const chatTitle = project?.name ?? ws?.name;
  const chatId = await ensureCanonicalChat(sb, workspaceId, chatTitle, projectId);
  if (!chatId) return { ok: false, error: "Não foi possível abrir a conversa." };

  const [ctx, projectCtx, allDecisions, artifacts] = await Promise.all([
    getWorkspaceContext(workspaceId),
    projectId ? getWorkspaceContext(workspaceId, projectId) : Promise.resolve(null),
    getDecisions().catch(() => []),
    getArtifactsForInitiative(workspaceId).catch(() => []),
  ]);
  const ctxVersion = (project ? projectCtx?.version : ctx?.version) ?? null;
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

  const thread = (await getMessages(chatId))
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-30)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const system = councilSystemMessage(
    ws?.name,
    ctx,
    activeDecisions,
    artifactList,
    project ? { name: project.name, ctx: projectCtx } : undefined
  );

  return {
    ok: true,
    chatId,
    workspaceName: ws?.name,
    projectName: project?.name,
    messages: [{ role: "system", content: system }, ...thread],
    ctxVersion,
  };
}

/** Persist the assistant reply and bump the chat's updated_at; returns its id. */
export async function persistAssistantTurn(
  chatId: string,
  reply: {
    text: string;
    provider?: string;
    model?: string;
    taskType?: string;
    tokens?: number | null;
    latencyMs?: number;
    ctxVersion?: number | null;
    metadata?: Record<string, unknown>;
  }
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("workspace_messages")
    .insert({
      chat_id: chatId,
      role: "assistant",
      content: reply.text,
      provider: reply.provider,
      model: reply.model,
      task_type: reply.taskType,
      tokens: reply.tokens ?? null,
      latency_ms: reply.latencyMs ?? null,
      context_version: reply.ctxVersion ?? null,
      metadata: reply.metadata ?? {},
    })
    .select("id")
    .maybeSingle();
  await sb.from("workspace_chats").update({ updated_at: now() }).eq("id", chatId);
  return (data?.id as string) ?? null;
}

/** Update an existing message's metadata (merge-friendly: caller passes full). */
export async function updateMessageMetadata(
  messageId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("workspace_messages").update({ metadata }).eq("id", messageId);
}
