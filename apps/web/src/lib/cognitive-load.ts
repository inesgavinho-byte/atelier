import "server-only";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Cognitive Load (Personal Decimin v2). Estimates the user's *mental* load —
 * not productivity — from the open loops competing for attention: pending
 * commitments (Conversation Watch), decisions awaiting judgement, open
 * sessions, and how many pendings have gone stale. Returns a 0–100 score, a
 * band, the raw signals and a single recommendation. Read-only; degrades to a
 * low/empty load when data sources are unavailable.
 */

export type LoadBand = "baixa" | "média" | "alta";

export interface CognitiveLoad {
  score: number;
  band: LoadBand;
  pendingCommitments: number;
  pendingDecisions: number;
  openSessions: number;
  openConversations: number;
  staleItems: number;
  recommendation: string;
}

export async function getCognitiveLoad(): Promise<CognitiveLoad> {
  const sb = getSupabase();
  const admin = getSupabaseAdmin();
  const cutoff3d = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const cutoff24h = new Date(Date.now() - 86_400_000).toISOString();

  const [commitRes, staleRes, decisionRes, sessionRes, convoRes] = await Promise.all([
    admin
      ? admin
          .from("telegram_pending_items")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    admin
      ? admin
          .from("telegram_pending_items")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .lt("created_at", cutoff3d)
      : Promise.resolve({ count: 0 }),
    sb
      ? sb
          .from("decisions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente")
      : Promise.resolve({ count: 0 }),
    sb
      ? sb
          .from("workspace_chats")
          .select("id", { count: "exact", head: true })
          .eq("session_state", "active")
      : Promise.resolve({ count: 0 }),
    // Open conversations: chats touched in the last 24h (each turn bumps
    // updated_at). A proxy for how many threads are live across workspaces.
    sb
      ? sb
          .from("workspace_chats")
          .select("id", { count: "exact", head: true })
          .gte("updated_at", cutoff24h)
      : Promise.resolve({ count: 0 }),
  ]);

  const pendingCommitments = commitRes.count ?? 0;
  const staleItems = staleRes.count ?? 0;
  const pendingDecisions = decisionRes.count ?? 0;
  const openSessions = sessionRes.count ?? 0;
  const openConversations = convoRes.count ?? 0;

  // Weighted: decisions weigh most (they block), stale pendings nag, open
  // sessions fragment attention, recent conversations add light context-load.
  // Clamped to 0–100.
  const raw =
    pendingDecisions * 8 +
    pendingCommitments * 3 +
    openSessions * 4 +
    openConversations * 2 +
    staleItems * 5;
  const score = Math.min(100, raw);
  const band: LoadBand = score >= 60 ? "alta" : score >= 30 ? "média" : "baixa";

  let recommendation: string;
  if (band === "alta") {
    recommendation =
      `Carga alta — ${pendingDecisions} decisões + ${pendingCommitments} pendentes. ` +
      "Fecha 3 loops antes de começar algo novo.";
  } else if (band === "média") {
    recommendation =
      "Carga moderada. Resolve os pendentes mais antigos antes de abrir novas frentes.";
  } else {
    recommendation =
      "Espaço para trabalho profundo. Escolhe a frente de maior alavancagem.";
  }

  return {
    score,
    band,
    pendingCommitments,
    pendingDecisions,
    openSessions,
    openConversations,
    staleItems,
    recommendation,
  };
}
