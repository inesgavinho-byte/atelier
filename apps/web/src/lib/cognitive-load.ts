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
  staleItems: number;
  recommendation: string;
}

export async function getCognitiveLoad(): Promise<CognitiveLoad> {
  const sb = getSupabase();
  const admin = getSupabaseAdmin();
  const cutoff3d = new Date(Date.now() - 3 * 86_400_000).toISOString();

  const [commitRes, staleRes, decisionRes, sessionRes] = await Promise.all([
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
  ]);

  const pendingCommitments = commitRes.count ?? 0;
  const staleItems = staleRes.count ?? 0;
  const pendingDecisions = decisionRes.count ?? 0;
  const openSessions = sessionRes.count ?? 0;

  // Weighted: decisions weigh most (they block), stale pendings nag, open
  // sessions fragment attention. Clamped to 0–100.
  const raw =
    pendingDecisions * 8 +
    pendingCommitments * 3 +
    openSessions * 4 +
    staleItems * 5;
  const score = Math.min(100, raw);
  const band: LoadBand = score >= 60 ? "alta" : score >= 30 ? "média" : "baixa";

  let recommendation: string;
  if (band === "alta") {
    recommendation = `Evita aceitar trabalho novo hoje. Fecha primeiro ${
      pendingDecisions > 0 ? `${Math.min(pendingDecisions, 3)} decisões em aberto` : "os loops em aberto"
    }.`;
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
    staleItems,
    recommendation,
  };
}
