import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { SessionState, WorkspaceSession } from "@/lib/sessions-constants";

/**
 * Sessions with intent (ADR-0005 F2). A session is a workspace_chats row with
 * an `objective` set — an intentful unit of work (Investigação, Escrita, …).
 * The always-on continuous chat (no objective) is left untouched; only
 * intentful sessions surface here. Client-safe types/constants live in
 * lib/sessions-constants.
 */

export type { SessionState, WorkspaceSession } from "@/lib/sessions-constants";
export { SESSION_SKILLS } from "@/lib/sessions-constants";

const toSession = (r: any): WorkspaceSession => ({
  id: r.id,
  workspaceId: r.workspace_id,
  objective: r.objective,
  skill: r.skill_id ?? null,
  state: (r.session_state as SessionState) ?? "active",
  startedAt: r.created_at,
  endedAt: r.ended_at ?? null,
});

/** Intentful sessions for a workspace, active first then most recent. */
export async function getSessions(
  workspaceId: string
): Promise<WorkspaceSession[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("workspace_chats")
    .select("id, workspace_id, objective, skill_id, session_state, created_at, ended_at")
    .eq("workspace_id", workspaceId)
    .not("objective", "is", null)
    .order("created_at", { ascending: false });
  const sessions = (data ?? []).map(toSession);
  // Active sessions float to the top; the rest stay newest-first.
  return sessions.sort((a, b) => {
    const ap = a.state === "active" ? 0 : 1;
    const bp = b.state === "active" ? 0 : 1;
    return ap - bp;
  });
}
