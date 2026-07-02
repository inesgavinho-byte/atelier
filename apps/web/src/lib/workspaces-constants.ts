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
  /** The main workspace (Organisational Intelligence) — federated visibility. */
  isMain?: boolean;
  /** Associated GitHub repository "owner/repo" (optional). */
  githubRepo?: string;
}

export interface WorkspaceProject {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: string;
  /** Project-specific GitHub repo, "owner/repo" (optional). */
  githubRepo?: string;
  /** Explicit ordering within a workspace (ascending). */
  sort: number;
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
  /** Council enrichments: { citations?: string[], steps?: NextStep[] }. */
  metadata?: Record<string, unknown>;
  createdAt: string;
}
