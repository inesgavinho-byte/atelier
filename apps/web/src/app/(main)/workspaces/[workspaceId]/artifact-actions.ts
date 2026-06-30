"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import {
  getArtifactDetail,
  summariseArtifactChange,
  indexArtifactForRag,
  type ArtifactDetail,
} from "@/lib/artifacts";

const now = () => new Date().toISOString();
const shortId = (prefix: string) =>
  `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
const firstLine = (text: string) =>
  (text.trim().split("\n")[0] || "Artefacto").slice(0, 120);

/**
 * Living Artifacts (Sprint 3). Every revision — including the first and the
 * current — is recorded in artifact_revisions with a summary (what changed,
 * via Haiku) and an author. artifacts.content/revision denormalises the latest.
 */

export async function createArtifact(input: {
  workspaceId: string;
  title?: string;
  content: string;
  kind?: string;
  createdBy?: string;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const id = shortId("art");
  const author = input.createdBy?.trim() || "Council";
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
  // Revision 1 is the creation snapshot.
  await sb.from("artifact_revisions").insert({
    artifact_id: id,
    content: input.content,
    revision: 1,
    summary: "Revisão inicial",
    created_by: author,
  });
  await indexArtifactForRag(id);
  revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, id, message: "Artefacto guardado." };
}

export async function updateArtifact(input: {
  id: string;
  content: string;
  workspaceId?: string;
  createdBy?: string;
  /** Skip the Haiku summary and use this text verbatim (e.g. restore). */
  summary?: string;
}): Promise<{ ok: boolean; revision?: number; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const { data: current } = await sb
    .from("artifacts")
    .select("content, revision")
    .eq("id", input.id)
    .maybeSingle();
  if (!current) return { ok: false, message: "Artefacto não encontrado." };

  const prevContent = current.content ?? "";
  if (prevContent === input.content)
    return { ok: false, message: "Sem alterações para guardar." };

  const nextRevision = (current.revision ?? 1) + 1;
  const summary =
    input.summary ?? (await summariseArtifactChange(prevContent, input.content));

  // Record the new revision (the new content), then advance the artifact.
  const { error: revErr } = await sb.from("artifact_revisions").insert({
    artifact_id: input.id,
    content: input.content,
    revision: nextRevision,
    summary,
    created_by: input.createdBy?.trim() || "Inês",
  });
  if (revErr) return { ok: false, message: revErr.message };

  const { error } = await sb
    .from("artifacts")
    .update({ content: input.content, revision: nextRevision, updated_at: now() })
    .eq("id", input.id);
  if (error) return { ok: false, message: error.message };

  await indexArtifactForRag(input.id);
  if (input.workspaceId) revalidatePath(`/workspaces/${input.workspaceId}`);
  return {
    ok: true,
    revision: nextRevision,
    message: `Artefacto actualizado (v${nextRevision}).`,
  };
}

/**
 * Restore a past revision: re-applies its content as a new revision (history is
 * never rewritten), summarised as "Restaurado da v{n}".
 */
export async function restoreArtifactRevision(input: {
  id: string;
  revision: number;
  workspaceId?: string;
  createdBy?: string;
}): Promise<{ ok: boolean; revision?: number; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const { data: rev } = await sb
    .from("artifact_revisions")
    .select("content")
    .eq("artifact_id", input.id)
    .eq("revision", input.revision)
    .maybeSingle();
  if (!rev) return { ok: false, message: "Revisão não encontrada." };
  return updateArtifact({
    id: input.id,
    content: rev.content ?? "",
    workspaceId: input.workspaceId,
    createdBy: input.createdBy,
    summary: `Restaurado da v${input.revision}`,
  });
}

/** Load an artifact's content + revision history for the drawer. */
export async function loadArtifactDetail(
  id: string
): Promise<ArtifactDetail | null> {
  return getArtifactDetail(id);
}
