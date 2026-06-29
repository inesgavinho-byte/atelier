import "server-only";
import { getSupabase } from "@/lib/supabase";

/**
 * Living Artifacts (Bloco E). An artifact carries canonical `content` and a
 * `revision` number; each update archives the prior version into
 * artifact_revisions. The current content lives on the artifact row; the
 * history lives in artifact_revisions (newest first).
 */

export interface ArtifactRevision {
  id: string;
  revision: number;
  content: string;
  createdAt: string;
}

export interface ArtifactDetail {
  id: string;
  title: string;
  kind: string;
  state: string;
  content: string;
  revision: number;
  updatedAt: string;
  revisions: ArtifactRevision[];
}

export async function getArtifactDetail(
  id: string
): Promise<ArtifactDetail | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("artifacts")
    .select("id, title, kind, state, content, revision, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { data: revs } = await sb
    .from("artifact_revisions")
    .select("id, revision, content, created_at")
    .eq("artifact_id", id)
    .order("revision", { ascending: false });
  return {
    id: data.id,
    title: data.title,
    kind: data.kind,
    state: data.state,
    content: data.content ?? "",
    revision: data.revision ?? 1,
    updatedAt: data.updated_at,
    revisions: (revs ?? []).map((r: any) => ({
      id: r.id,
      revision: r.revision,
      content: r.content ?? "",
      createdAt: r.created_at,
    })),
  };
}
