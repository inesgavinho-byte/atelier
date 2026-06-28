/**
 * ATELIER — Workspaces constants & types (client-safe).
 *
 * No `server-only`, no Supabase — safe to import from client components. The
 * data access lives in `workspaces.ts` (server-only) and re-exports these.
 */

export const WORKSPACE_STATUSES = ["Ativo", "Arquivado"] as const;
export const CHAT_PROVIDERS = [
  "ATELIER",
  "OpenAI",
  "Claude",
  "Perplexity",
  "Manus",
] as const;

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceProject {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceChat {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  mode?: string;
  skillId?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  reasoning?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMessage {
  id: string;
  chatId: string;
  role: string;
  content: string;
  provider?: string;
  model?: string;
  skillId?: string;
  taskType?: string;
  tokens?: number;
  latencyMs?: number;
  createdAt: string;
}
