"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import type { AgentState, Priority } from "@/data/mission";

/**
 * Supervision actions for an agent (EPIC-001 §3): interrupt/resume, delegate,
 * change priority. Unlike the earlier demonstration, these persist: they update
 * the agent row and append an entry to the activity log, so the change survives
 * a reload and shows up in the agent's Histórico.
 *
 * Server-only (writes use the server Supabase client, which prefers the service
 * role). Everything degrades quietly when Supabase is not configured.
 */

type SbClient = NonNullable<ReturnType<typeof getSupabase>>;

async function logActivity(sb: SbClient, agentId: string, title: string) {
  await sb.from("activity").insert({
    id: crypto.randomUUID(),
    kind: "agente",
    title,
    agent_id: agentId,
    at: new Date().toISOString(),
  });
}

function revalidateAgent(agentId: string) {
  revalidatePath(`/agents/${agentId}`);
  revalidatePath("/agents");
  revalidatePath("/mission");
}

/** Move an agent to a new state and record the supervision event. */
export async function setAgentState(
  agentId: string,
  next: AgentState,
  note: string
) {
  const sb = getSupabase();
  if (!sb) return;
  const now = new Date().toISOString();
  await sb
    .from("agents")
    .update({ state: next, last_event: note, last_event_at: now })
    .eq("id", agentId);
  await logActivity(sb, agentId, note);
  revalidateAgent(agentId);
}

/** Persist the operator-set priority and record it. */
export async function setAgentPriority(agentId: string, priority: Priority) {
  const sb = getSupabase();
  if (!sb) return;
  const note = `Prioridade alterada para ${priority}`;
  await sb
    .from("agents")
    .update({ priority, last_event: note, last_event_at: new Date().toISOString() })
    .eq("id", agentId);
  await logActivity(sb, agentId, note);
  revalidateAgent(agentId);
}
