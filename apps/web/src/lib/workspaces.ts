import "server-only";
import { cache } from "react";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  Workspace,
  WorkspaceChat,
  WorkspaceMessage,
  WorkspaceProject,
} from "@/lib/workspaces-constants";

/**
 * ATELIER — Workspaces / projects / chats data access.
 *
 * Workspaces are sandboxes that hold projects, and projects hold chats; chats
 * hold messages. The chat context belongs to ATELIER — the provider is only
 * metadata. Every reader guards a missing Supabase client and degrades to
 * empty. Constants and types live in `workspaces-constants.ts` (client-safe)
 * and are re-exported here.
 */

export {
  WORKSPACE_STATUSES,
  CHAT_PROVIDERS,
  type Workspace,
  type WorkspaceProject,
  type WorkspaceChat,
  type WorkspaceMessage,
} from "@/lib/workspaces-constants";

const toWorkspace = (r: any): Workspace => ({
  id: r.id,
  name: r.name,
  description: r.description ?? undefined,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toProject = (r: any): WorkspaceProject => ({
  id: r.id,
  workspaceId: r.workspace_id,
  name: r.name,
  description: r.description ?? undefined,
  status: r.status,
  githubRepo: r.github_repo ?? undefined,
  sort: r.sort ?? 0,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toChat = (r: any): WorkspaceChat => ({
  id: r.id,
  workspaceId: r.workspace_id,
  projectId: r.project_id ?? undefined,
  title: r.title,
  mode: r.mode ?? undefined,
  skillId: r.skill_id ?? undefined,
  provider: r.provider ?? undefined,
  model: r.model ?? undefined,
  temperature: r.temperature ?? undefined,
  reasoning: r.reasoning ?? undefined,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toMessage = (r: any): WorkspaceMessage => ({
  id: r.id,
  chatId: r.chat_id,
  role: r.role,
  content: r.content,
  provider: r.provider ?? undefined,
  model: r.model ?? undefined,
  skillId: r.skill_id ?? undefined,
  taskType: r.task_type ?? undefined,
  tokens: r.tokens ?? undefined,
  latencyMs: r.latency_ms ?? undefined,
  metadata: r.metadata ?? undefined,
  createdAt: r.created_at,
});

export const getWorkspaces = cache(getWorkspacesUncached);
async function getWorkspacesUncached(): Promise<Workspace[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(toWorkspace);
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data } = await sb.from("workspaces").select("*").eq("id", id).maybeSingle();
  return data ? toWorkspace(data) : undefined;
}

export async function getProjects(
  workspaceId: string
): Promise<WorkspaceProject[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("workspace_projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map(toProject);
}

/** All projects across every workspace — used by global search. */
export const getAllProjects = cache(getAllProjectsUncached);
async function getAllProjectsUncached(): Promise<WorkspaceProject[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("workspace_projects").select("*");
  return (data ?? []).map(toProject);
}

/** All chats across every workspace — used by global search. */
export const getAllChats = cache(getAllChatsUncached);
async function getAllChatsUncached(): Promise<WorkspaceChat[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("workspace_chats").select("*");
  return (data ?? []).map(toChat);
}

export async function getProject(
  id: string
): Promise<WorkspaceProject | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data } = await sb
    .from("workspace_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? toProject(data) : undefined;
}

/** Chats in a workspace, optionally scoped to a project. */
export async function getChats(
  workspaceId: string,
  projectId?: string
): Promise<WorkspaceChat[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from("workspace_chats")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (projectId) q = q.eq("project_id", projectId);
  const { data } = await q.order("updated_at", { ascending: false });
  return (data ?? []).map(toChat);
}

export async function getChat(id: string): Promise<WorkspaceChat | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data } = await sb
    .from("workspace_chats")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? toChat(data) : undefined;
}

export async function getMessages(
  chatId: string
): Promise<WorkspaceMessage[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("workspace_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(toMessage);
}

/**
 * The single canonical chat for a workspace or one of its projects — the
 * continuous conversation (ADR-0004 / ADR-0005 F1). Without a projectId this is
 * the workspace-level chat (project_id IS NULL); with one it is that project's
 * chat. Deterministically the EARLIEST created matching chat, so the page and
 * the send action always agree. Returns undefined when none exists yet (the
 * first sent message creates it).
 */
export async function getCanonicalChat(
  workspaceId: string,
  projectId?: string
): Promise<WorkspaceChat | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  let q = sb
    .from("workspace_chats")
    .select("*")
    .eq("workspace_id", workspaceId);
  q = projectId ? q.eq("project_id", projectId) : q.is("project_id", null);
  const { data } = await q
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? toChat(data) : undefined;
}

/* ── Workspace context (ADR-0004) ─────────────────────────────────────────── */

export interface WorkspaceContext {
  workspaceId: string;
  projectId: string | null;
  summary: string;
  decisions: unknown[];
  artifacts: unknown[];
  lessons: unknown[];
  version: number;
  lastUpdatedAt: string | null;
}

/**
 * The compressed memory for a workspace or one of its projects, maintained by
 * the context agent. Without a projectId this is the workspace-level memory
 * (project_id IS NULL); with one it is that project's memory. Read via the
 * service role (the table is RLS-locked). Returns null when absent or
 * unreachable — the chat then runs with no compressed context yet.
 */
export async function getWorkspaceContext(
  workspaceId: string,
  projectId?: string
): Promise<WorkspaceContext | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  let q = admin
    .from("workspace_context")
    .select(
      "workspace_id, project_id, summary, decisions, artifacts, lessons, version, last_updated_at"
    )
    .eq("workspace_id", workspaceId);
  q = projectId ? q.eq("project_id", projectId) : q.is("project_id", null);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return {
    workspaceId: data.workspace_id,
    projectId: data.project_id ?? null,
    summary: data.summary ?? "",
    decisions: data.decisions ?? [],
    artifacts: data.artifacts ?? [],
    lessons: data.lessons ?? [],
    version: data.version ?? 1,
    lastUpdatedAt: data.last_updated_at ?? null,
  };
}
