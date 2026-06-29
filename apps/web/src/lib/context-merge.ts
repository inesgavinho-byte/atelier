import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ExtractedContext } from "@/lib/context-import";

/**
 * ATELIER — merge an extraction into a workspace's compressed memory
 * (workspace_context). Shared by single imports and batch imports. Appends to
 * the existing lists/summary — never replaces — and bumps the version. Written
 * via the service role (the table is RLS-locked).
 */

/** Append unique strings (case-insensitive) onto an existing list. */
export function mergeList(existing: unknown[], incoming: string[]): string[] {
  const out = existing.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  const seen = new Set(out.map((x) => x.toLowerCase()));
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export async function mergeWorkspaceContext(
  workspaceId: string,
  extracted: ExtractedContext,
  projectId: string | null = null
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  let q = admin
    .from("workspace_context")
    .select("summary, decisions, artifacts, lessons, version")
    .eq("workspace_id", workspaceId);
  q = projectId ? q.eq("project_id", projectId) : q.is("project_id", null);
  const { data: existing } = await q.maybeSingle();

  const summaryParts = [
    (existing?.summary ?? "").trim(),
    extracted.summary.trim(),
  ].filter(Boolean);

  await admin.from("workspace_context").upsert(
    {
      workspace_id: workspaceId,
      project_id: projectId,
      summary: summaryParts.join("\n\n"),
      decisions: mergeList(existing?.decisions ?? [], extracted.decisions),
      artifacts: mergeList(existing?.artifacts ?? [], extracted.artifacts),
      lessons: mergeList(existing?.lessons ?? [], extracted.lessons),
      version: (existing?.version ?? 0) + 1,
      last_updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,project_id" }
  );
}
