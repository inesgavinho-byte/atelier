"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { getRecentCaptures, type Capture } from "@/lib/mission";
import type { DecisionStatus } from "@/data/mission";

/** Past-tense label for the activity log, per resolution. */
const STATUS_VERB: Record<DecisionStatus, string> = {
  aprovada: "aprovada",
  rejeitada: "rejeitada",
  adiada: "adiada",
  revisão: "enviada para revisão",
  pendente: "reaberta",
};

/**
 * Persist a decision's status (Aprovar / Rejeitar / Adiar / Pedir revisão, or
 * back to pendente). Writes to the real "Atelier" database, stamps updated_at,
 * appends an entry to the activity feed (so the resolution is auditable), then
 * revalidates the surfaces that show decisions.
 */
export async function setDecisionStatus(
  id: string,
  status: DecisionStatus
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const now = new Date().toISOString();
  const { data: dec } = await sb
    .from("decisions")
    .select("title, workspace_id")
    .eq("id", id)
    .maybeSingle();

  await sb.from("decisions").update({ status, updated_at: now }).eq("id", id);

  if (dec) {
    await sb.from("activity").insert({
      id: crypto.randomUUID(),
      kind: "decisão",
      title: `Decisão ${STATUS_VERB[status]}: ${dec.title}`,
      workspace_id: dec.workspace_id ?? null,
      at: now,
    });
  }

  revalidatePath("/");
  revalidatePath("/decisions");
  revalidatePath(`/decisions/${id}`);
}

/** Persist a capture to local memory's successor — the captures table. */
export async function createCapture(
  kind: string,
  value: string
): Promise<Capture[]> {
  const sb = getSupabase();
  if (!sb) return [];
  await sb.from("captures").insert({ kind, value });
  return getRecentCaptures();
}

export async function listRecentCaptures(): Promise<Capture[]> {
  return getRecentCaptures();
}
