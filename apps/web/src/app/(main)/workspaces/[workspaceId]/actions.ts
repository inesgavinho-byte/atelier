"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { runtime } from "@/lib/ai-runtime/runtime";
import { runDebate, type Perspective } from "@/lib/ai-runtime/debate";
import type { DocSource } from "@/lib/documents";
import {
  prepareWorkspaceTurn,
  persistAssistantTurn,
} from "@/lib/workspace-chat";
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
 * Live overview for a project's configured repo. Reads the repo server-side
 * from the project row, so the client cannot point our token at an arbitrary
 * repository. Returns null when none is configured / no token.
 */
export async function getProjectRepoOverview(
  projectId: string
): Promise<RepoOverview | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("workspace_projects")
    .select("github_repo")
    .eq("id", projectId)
    .maybeSingle();
  const repo = data?.github_repo as string | null | undefined;
  if (!repo) return null;
  return getRepoOverview(repo);
}

/**
 * Send a message in a workspace's continuous chat (ADR-0004), blocking variant.
 * Streaming goes through the chat-stream route; this remains as a fallback and
 * shares the exact same turn preparation + persistence (lib/workspace-chat).
 * The Council picks the provider — never the user.
 */
export async function sendWorkspaceMessage(
  workspaceId: string,
  content: string,
  projectId?: string
): Promise<{
  ok: boolean;
  text?: string;
  content?: string;
  model?: string;
  provider?: string;
  taskType?: string;
  error?: string;
}> {
  const prepared = await prepareWorkspaceTurn(workspaceId, content, projectId);

  const revalidate = () => {
    revalidatePath(`/workspaces/${workspaceId}`);
    if (projectId)
      revalidatePath(`/workspaces/${workspaceId}/projects/${projectId}`);
  };

  if (!prepared.ok || !prepared.chatId || !prepared.messages) {
    return { ok: false, error: prepared.error ?? "Falha ao preparar a conversa." };
  }

  const result = await runtime.run({
    workspaceName: prepared.workspaceName,
    projectName: prepared.projectName,
    messages: prepared.messages,
  });

  if (!result.ok) {
    revalidate();
    return { ok: false, error: result.error ?? "Falha na execução." };
  }

  await persistAssistantTurn(prepared.chatId, {
    text: result.text ?? "",
    provider: result.provider,
    model: result.model,
    taskType: result.taskType,
    tokens: result.tokens ?? null,
    latencyMs: result.latencyMs,
    ctxVersion: prepared.ctxVersion,
    metadata: prepared.sources?.length ? { sources: prepared.sources } : undefined,
  });

  revalidate();
  return {
    ok: true,
    text: result.text,
    content: result.text,
    model: result.model,
    provider: result.provider,
    taskType: result.taskType,
  };
}

/**
 * Run the full Council (LLM debate) for a complex question: several models
 * answer in parallel, then one synthesises. Persists the synthesis as the
 * assistant turn, with the panel perspectives in metadata. Falls back to an
 * error when fewer than two panellists are available — the UI then suggests a
 * normal message.
 */
export async function sendCouncilDebate(
  workspaceId: string,
  content: string,
  projectId?: string
): Promise<{
  ok: boolean;
  synthesis?: string;
  perspectives?: Perspective[];
  sources?: DocSource[];
  model?: string;
  error?: string;
}> {
  const prepared = await prepareWorkspaceTurn(workspaceId, content, projectId);

  const revalidate = () => {
    revalidatePath(`/workspaces/${workspaceId}`);
    if (projectId)
      revalidatePath(`/workspaces/${workspaceId}/projects/${projectId}`);
  };

  if (!prepared.ok || !prepared.chatId || !prepared.messages) {
    return { ok: false, error: prepared.error ?? "Falha ao preparar a conversa." };
  }

  const debate = await runDebate(prepared.messages);
  if (!debate.ok) {
    revalidate();
    return { ok: false, error: debate.error ?? "Falha no debate." };
  }

  const sources = prepared.sources ?? [];
  await persistAssistantTurn(prepared.chatId, {
    text: debate.synthesis,
    provider: "council",
    model: debate.synthModel ?? "council",
    taskType: "complex",
    ctxVersion: prepared.ctxVersion,
    metadata: {
      debate: debate.perspectives,
      ...(sources.length ? { sources } : {}),
    },
  });

  revalidate();
  return {
    ok: true,
    synthesis: debate.synthesis,
    perspectives: debate.perspectives,
    sources,
    model: debate.synthModel,
  };
}
