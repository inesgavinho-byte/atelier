"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { MinionState, SignalStatus } from "@/lib/minions";

const now = () => new Date().toISOString();

/**
 * "Executar agora" — mark a minion due so the Railway worker picks it up on its
 * next scheduler tick (within ~5 min). The app never runs the LLM itself; the
 * worker owns execution. Also clears a previous error so it returns to active.
 */
export async function runMinionNow(
  id: string
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service role não configurado." };
  const { error } = await admin
    .from("minions")
    .update({ next_run_at: now(), state: "active", last_error: null, updated_at: now() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/minions");
  return { ok: true, message: "Agendado para a próxima passagem do worker." };
}

/** Pause or resume a minion. */
export async function setMinionState(
  id: string,
  state: MinionState
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service role não configurado." };
  const { error } = await admin
    .from("minions")
    .update({ state, updated_at: now() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/minions");
  return { ok: true, message: state === "paused" ? "Pausado." : "Retomado." };
}

/** Set a minion's autonomy level (0–5). */
export async function setMinionAutonomy(
  id: string,
  level: number
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service role não configurado." };
  const clamped = Math.max(0, Math.min(5, Math.round(level)));
  const { error } = await admin
    .from("minions")
    .update({ autonomy_level: clamped, updated_at: now() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/minions");
  return { ok: true, message: `Autonomia: nível ${clamped}.` };
}

/** Set a Personal Decimin capability's mode (Shadow Mode, v2). */
export async function setCapabilityMode(
  capability: string,
  mode: "active" | "shadow" | "off"
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service role não configurado." };
  const { error } = await admin
    .from("decimin_capabilities")
    .update({ mode, updated_at: now() })
    .eq("capability", capability);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/minions");
  const label =
    mode === "active" ? "activa" : mode === "shadow" ? "em shadow" : "desligada";
  return { ok: true, message: `Capacidade ${label}.` };
}

/* ── Conversation Watch (ADR-0006) ──────────────────────────────────────────── */

/** Link (or unlink) a Telegram group to a workspace — routes its items there. */
export async function setGroupWorkspace(
  groupId: string,
  workspaceId: string | null
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service role não configurado." };
  const { error } = await admin
    .from("telegram_groups")
    .update({ workspace_id: workspaceId || null })
    .eq("id", groupId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/minions");
  return { ok: true, message: workspaceId ? "Grupo ligado." : "Grupo desligado." };
}

/** Set a group's Conversation Watch autonomy level (0–5). */
export async function setGroupAutonomy(
  groupId: string,
  level: number
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service role não configurado." };
  const clamped = Math.max(0, Math.min(5, Math.round(level)));
  // Level 0 turns the group off entirely; ≥1 keeps it active (the worker only
  // analyses messages at level ≥ 2).
  const { error } = await admin
    .from("telegram_groups")
    .update({ autonomy_level: clamped, active: clamped > 0 })
    .eq("id", groupId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/minions");
  return { ok: true, message: `Autonomia: nível ${clamped}.` };
}

/** Resolve / dismiss a pending item from the dashboard. */
export async function setPendingItemStatus(
  id: string,
  status: "resolved" | "dismissed"
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service role não configurado." };
  const { error } = await admin
    .from("telegram_pending_items")
    .update({ status, resolved_at: now() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/minions");
  return { ok: true, message: status === "resolved" ? "Resolvido." : "Dispensado." };
}

/** Mark a signal reviewed / actioned / dismissed. */
export async function setSignalStatus(
  id: string,
  status: SignalStatus
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service role não configurado." };
  const { error } = await admin
    .from("minion_signals")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/minions");
  return { ok: true, message: "Sinal actualizado." };
}
