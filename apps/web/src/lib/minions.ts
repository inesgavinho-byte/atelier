import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * ATELIER — Minions data access (EPIC-003).
 *
 * Minions and their signals are RLS-locked to the service role, so every read
 * here goes through getSupabaseAdmin() and degrades to empty when the service
 * role isn't configured. The Railway worker writes; the app only reads + nudges.
 */

export type MinionState = "active" | "paused" | "error";
export type SignalKind =
  | "info"
  | "warning"
  | "decision_required"
  | "opportunity"
  | "risk"
  | "pattern";

/** Structured metadata for a cross-Space pattern signal (Pattern Decimin). */
export interface PatternMeta {
  spaces?: string[];
  confidence?: number;
  type?: string;
}
export type SignalStatus = "pending" | "reviewed" | "actioned" | "dismissed";

export interface Minion {
  id: string;
  name: string;
  slug: string;
  mission: string;
  sources: unknown[];
  frequencyMinutes: number;
  autonomyLevel: number;
  state: MinionState;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastError: string | null;
  pendingCount: number;
}

export interface MinionSignal {
  id: string;
  minionId: string;
  workspaceId: string | null;
  kind: SignalKind;
  signal: string;
  evidence: string[];
  interpretation: string | null;
  recommendedAction: string | null;
  approvalRequired: boolean;
  status: SignalStatus;
  createdAt: string;
  /** Structured metadata (pattern signals carry spaces/confidence/type). */
  metadata: PatternMeta;
}

const toSignal = (r: any): MinionSignal => ({
  id: r.id,
  minionId: r.minion_id,
  workspaceId: r.workspace_id ?? null,
  kind: r.kind,
  signal: r.signal,
  evidence: Array.isArray(r.evidence) ? r.evidence.map(String) : [],
  interpretation: r.interpretation ?? null,
  recommendedAction: r.recommended_action ?? null,
  approvalRequired: Boolean(r.approval_required),
  status: r.status,
  createdAt: r.created_at,
  metadata:
    r.metadata && typeof r.metadata === "object" ? (r.metadata as PatternMeta) : {},
});

/** All minions with a count of their still-pending signals. */
export async function getMinions(): Promise<Minion[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const [{ data: minions }, { data: pending }] = await Promise.all([
    admin.from("minions").select("*").order("frequency_minutes"),
    admin.from("minion_signals").select("minion_id").eq("status", "pending"),
  ]);
  const counts = new Map<string, number>();
  for (const s of pending ?? [])
    counts.set(s.minion_id, (counts.get(s.minion_id) ?? 0) + 1);

  return (minions ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    mission: r.mission,
    sources: Array.isArray(r.sources) ? r.sources : [],
    frequencyMinutes: r.frequency_minutes,
    autonomyLevel: r.autonomy_level,
    state: r.state,
    lastRunAt: r.last_run_at ?? null,
    nextRunAt: r.next_run_at ?? null,
    lastError: r.last_error ?? null,
    pendingCount: counts.get(r.id) ?? 0,
  }));
}

/** Recent signals for one minion. */
export async function getMinionSignals(
  minionId: string,
  limit = 10
): Promise<MinionSignal[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("minion_signals")
    .select("*")
    .eq("minion_id", minionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(toSignal);
}

/**
 * Signals that need the operator's attention: still pending AND either flagged
 * for approval or of a high-attention kind. Drives the page's top section.
 */
export async function getPendingSignals(limit = 30): Promise<MinionSignal[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("minion_signals")
    .select("*")
    .eq("status", "pending")
    .or("approval_required.eq.true,kind.eq.risk,kind.eq.decision_required")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(toSignal);
}

/** Count of all pending signals — used for the sidebar badge. */
export async function countPendingSignals(): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;
  const { count } = await admin
    .from("minion_signals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}
