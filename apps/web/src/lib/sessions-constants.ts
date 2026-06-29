/**
 * Client-safe session types + constants (ADR-0005 F2). Kept out of
 * lib/sessions.ts (which is server-only) so client components can import them.
 */

export type SessionState = "active" | "completed" | "archived";

export interface WorkspaceSession {
  id: string;
  workspaceId: string;
  objective: string;
  skill: string | null;
  state: SessionState;
  startedAt: string;
  endedAt: string | null;
}

/** Preset skills (no Knowledge Library table yet — a curated list for v1). */
export const SESSION_SKILLS = [
  "Investigação",
  "Escrita",
  "Revisão",
  "Código",
  "Planeamento",
] as const;
