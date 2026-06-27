import "server-only";
import { getSupabase } from "@/lib/supabase";
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
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toChat = (r: any): WorkspaceChat => ({
  id: r.id,
  workspaceId: r.workspace_id,
  projectId: r.project_id ?? undefined,
  title: r.title,
  provider: r.provider ?? undefined,
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
  createdAt: r.created_at,
});

export async function getWorkspaces(): Promise<Workspace[]> {
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
    .order("created_at", { ascending: false });
  return (data ?? []).map(toProject);
}

/** All projects across every workspace — used by global search. */
export async function getAllProjects(): Promise<WorkspaceProject[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("workspace_projects").select("*");
  return (data ?? []).map(toProject);
}

/** All chats across every workspace — used by global search. */
export async function getAllChats(): Promise<WorkspaceChat[]> {
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
