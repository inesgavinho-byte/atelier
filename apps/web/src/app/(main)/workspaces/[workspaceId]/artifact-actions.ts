"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { getArtifactDetail, type ArtifactDetail } from "@/lib/artifacts";

const now = () => new Date().toISOString();
const shortId = (prefix: string) =>
  `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
const firstLine = (text: string) =>
  (text.trim().split("\n")[0] || "Artefacto").slice(0, 120);

/**
 * Living Artifacts (Bloco E). Create a new artifact (revision 1) or update an
 * existing one — an update first archives the current content into
 * artifact_revisions, then bumps the revision and stores the new content.
 */
export async function createArtifact(input: {
  workspaceId: string;
  title?: string;
  content: string;
  kind?: string;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const id = shortId("art");
  const { error } = await sb.from("artifacts").insert({
    id,
    workspace_id: input.workspaceId,
    title: input.title?.trim() || firstLine(input.content),
    kind: input.kind || "nota",
    state: "rascunho",
    content: input.content,
    revision: 1,
    updated_at: now(),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, id, message: "Artefacto guardado." };
}

export async function updateArtifact(input: {
  id: string;
  content: string;
  workspaceId?: string;
}): Promise<{ ok: boolean; revision?: number; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const { data: current } = await sb
    .from("artifacts")
    .select("content, revision")
    .eq("id", input.id)
    .maybeSingle();
  if (!current) return { ok: false, message: "Artefacto não encontrado." };

  const prevRevision = current.revision ?? 1;
  // Archive the version we're replacing, then advance.
  await sb.from("artifact_revisions").insert({
    artifact_id: input.id,
    content: current.content ?? "",
    revision: prevRevision,
  });
  const nextRevision = prevRevision + 1;
  const { error } = await sb
    .from("artifacts")
    .update({ content: input.content, revision: nextRevision, updated_at: now() })
    .eq("id", input.id);
  if (error) return { ok: false, message: error.message };

  if (input.workspaceId) revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, revision: nextRevision, message: `Artefacto actualizado (v${nextRevision}).` };
}

/** Load an artifact's content + revision history for the drawer. */
export async function loadArtifactDetail(
  id: string
): Promise<ArtifactDetail | null> {
  return getArtifactDetail(id);
}
