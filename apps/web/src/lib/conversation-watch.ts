import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * ATELIER — Conversation Watch data access (ADR-0006, Personal Decimin).
 *
 * telegram_groups and telegram_pending_items are RLS-locked to the service role
 * (the Railway worker writes them), so every read here goes through
 * getSupabaseAdmin() and degrades to empty when the service role isn't set.
 */

export interface TelegramGroup {
  id: string;
  telegramChatId: string;
  title: string;
  workspaceId: string | null;
  autonomyLevel: number;
  active: boolean;
  createdAt: string;
  pendingCount: number;
}

export interface PendingItem {
  id: string;
  groupId: string;
  groupTitle: string;
  workspaceId: string | null;
  kind: string;
  description: string;
  fromPerson: string | null;
  toPerson: string | null;
  dueDate: string | null;
  confidence: number | null;
  confidenceReason: string | null;
  status: string;
  createdAt: string;
}

/** Observed groups with a count of their still-pending items. */
export async function getTelegramGroups(): Promise<TelegramGroup[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const [{ data: groups }, { data: pending }] = await Promise.all([
    admin.from("telegram_groups").select("*").order("created_at", { ascending: true }),
    admin.from("telegram_pending_items").select("group_id").eq("status", "pending"),
  ]);
  const counts = new Map<string, number>();
  for (const p of pending ?? [])
    counts.set(p.group_id, (counts.get(p.group_id) ?? 0) + 1);
  return (groups ?? []).map((r: any) => ({
    id: r.id,
    telegramChatId: String(r.telegram_chat_id),
    title: r.title,
    workspaceId: r.workspace_id ?? null,
    autonomyLevel: r.autonomy_level,
    active: r.active,
    createdAt: r.created_at,
    pendingCount: counts.get(r.id) ?? 0,
  }));
}

/** Recent pending items across all groups, newest first. */
export async function getRecentPendingItems(limit = 30): Promise<PendingItem[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("telegram_pending_items")
    .select("*, telegram_groups(title)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    groupId: r.group_id,
    groupTitle: r.telegram_groups?.title ?? "(grupo)",
    workspaceId: r.workspace_id ?? null,
    kind: r.kind,
    description: r.description,
    fromPerson: r.from_person ?? null,
    toPerson: r.to_person ?? null,
    dueDate: r.due_date ?? null,
    confidence: typeof r.confidence === "number" ? r.confidence : null,
    confidenceReason: r.confidence_reason ?? null,
    status: r.status,
    createdAt: r.created_at,
  }));
}

/** Count of all still-pending items — used for the sidebar badge. */
export async function countPendingItems(): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;
  const { count } = await admin
    .from("telegram_pending_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}
