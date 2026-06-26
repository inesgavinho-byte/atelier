"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { getRecentCaptures, type Capture } from "@/lib/mission";
import type { DecisionStatus } from "@/data/mission";

/**
 * Persist a decision's status (Aprovar / Rejeitar / Adiar / Pedir revisão, or
 * back to pendente). Writes to the real "Atelier" database, then revalidates
 * the surfaces that show decisions.
 */
export async function setDecisionStatus(
  id: string,
  status: DecisionStatus
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("decisions").update({ status }).eq("id", id);
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
