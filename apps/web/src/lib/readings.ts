import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { Reading } from "@/lib/readings-constants";

/**
 * ATELIER — Reading inbox data access.
 *
 * A lightweight "save link for later" store backed by the `readings` table.
 * No scraping, no reader mode — just save, organise and retrieve links. Every
 * reader guards a missing Supabase client and degrades to empty. Constants and
 * types live in `readings-constants.ts` (client-safe) and are re-exported here.
 */

export {
  READING_TAGS,
  READING_STATUSES,
  type ReadingStatus,
  type Reading,
} from "@/lib/readings-constants";

const toReading = (r: any): Reading => ({
  id: r.id,
  url: r.url ?? undefined,
  title: r.title ?? undefined,
  note: r.note ?? undefined,
  workspaceId: r.workspace_id ?? undefined,
  tags: r.tags ?? [],
  status: r.status,
  sourceType: r.source_type ?? undefined,
  usedInArtifactId: r.used_in_artifact_id ?? undefined,
  content: r.content ?? undefined,
  excerpt: r.excerpt ?? undefined,
  thumbnail: r.thumbnail ?? undefined,
  readTimeMinutes: r.read_time_minutes ?? undefined,
  author: r.author ?? undefined,
  siteName: r.site_name ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function getReadings(): Promise<Reading[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("readings")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(toReading);
}

/** A single reading by id, or null when missing / Supabase unconfigured. */
export async function getReading(id: string): Promise<Reading | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("readings").select("*").eq("id", id).maybeSingle();
  return data ? toReading(data) : null;
}

/** Count of readings still to read — used by the desk inbox. */
export async function countUnreadReadings(): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  const { count } = await sb
    .from("readings")
    .select("*", { count: "exact", head: true })
    .eq("status", "Por ler");
  return count ?? 0;
}
