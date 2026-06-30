import "server-only";
import { getSupabase } from "@/lib/supabase";
import { gateway } from "@/lib/ai/gateway";
import { chunkMarkdown } from "@/lib/documents";
import { embedTexts, toVectorLiteral } from "@/lib/ai/embeddings";

const nowIso = () => new Date().toISOString();

/**
 * Living Artifacts (Sprint 3). An artifact carries canonical `content` and a
 * `revision` number; every revision — including the current one — is a row in
 * artifact_revisions, so the history is a complete timeline (number, summary of
 * what changed, author, date). artifacts.content/revision is the denormalised
 * "latest" for cheap reads.
 */

export interface ArtifactRevision {
  id: string;
  revision: number;
  content: string;
  summary: string;
  createdBy: string;
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
    .select("id, revision, content, summary, created_by, created_at")
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
      summary: r.summary ?? "",
      createdBy: r.created_by ?? "",
      createdAt: r.created_at,
    })),
  };
}

/**
 * One-sentence summary of what changed between two revisions, via Claude Haiku.
 * Best-effort: returns "" when the provider is unavailable or errors, so a save
 * never fails just because the summary couldn't be generated.
 */
export async function summariseArtifactChange(
  prev: string,
  next: string
): Promise<string> {
  // Nothing meaningful to compare (creation or empty diff).
  if (!prev.trim()) return "Revisão inicial";
  try {
    if (!gateway.get("claude")?.available()) return "";
    const res = await gateway.run({
      provider: "claude",
      model: "claude-haiku-4-5-20251001",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Resume numa única frase curta, em português europeu, o que mudou " +
            "entre duas versões de um documento. Foca o essencial (secções " +
            "adicionadas/removidas/reescritas). Sem preâmbulo, sem aspas. " +
            "Exemplo: “Adicionada secção de orçamento; removida referência ao cliente X.”",
        },
        {
          role: "user",
          content: `VERSÃO ANTERIOR:\n${prev.slice(0, 6000)}\n\nVERSÃO NOVA:\n${next.slice(0, 6000)}`,
        },
      ],
    });
    const text = (res.ok ? res.text ?? "" : "").trim().replace(/^["“]|["”]$/g, "");
    return text.slice(0, 280);
  } catch {
    return "";
  }
}

/**
 * Index an artifact's content for RAG (Sprint 3 PR2). Each artifact is mirrored
 * as a `documents` row (kind='artifact', linked by artifact_id) and chunked into
 * document_chunks, reusing the document pipeline so semantic search finds it.
 * Idempotent: re-chunks on every call. Best-effort and embedding-optional —
 * without OPENAI_API_KEY the chunks store no embedding and keyword retrieval
 * still finds them. Never throws (callers fire-and-forget).
 */
export async function indexArtifactForRag(artifactId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data: art } = await sb
      .from("artifacts")
      .select("id, title, content, workspace_id")
      .eq("id", artifactId)
      .maybeSingle();
    if (!art || !art.workspace_id) return;
    const content = (art.content ?? "").trim();

    const { data: existingDoc } = await sb
      .from("documents")
      .select("id")
      .eq("artifact_id", artifactId)
      .maybeSingle();
    let docId = existingDoc?.id as string | undefined;

    // Empty content → keep nothing indexed (drop stale chunks if any).
    if (!content) {
      if (docId) await sb.from("document_chunks").delete().eq("document_id", docId);
      return;
    }

    if (docId) {
      await sb
        .from("documents")
        .update({
          title: art.title,
          markdown: content,
          char_count: content.length,
          updated_at: nowIso(),
        })
        .eq("id", docId);
      await sb.from("document_chunks").delete().eq("document_id", docId);
    } else {
      const { data: created } = await sb
        .from("documents")
        .insert({
          workspace_id: art.workspace_id,
          project_id: null,
          title: art.title,
          kind: "artifact",
          markdown: content,
          char_count: content.length,
          status: "ready",
          artifact_id: artifactId,
        })
        .select("id")
        .maybeSingle();
      docId = created?.id as string | undefined;
      if (!docId) return;
    }

    const parts = chunkMarkdown(content);
    if (!parts.length) return;
    const vecs = await embedTexts(parts);
    const rows = parts.map((c, idx) => ({
      document_id: docId,
      workspace_id: art.workspace_id,
      project_id: null,
      idx,
      content: c,
      embedding: vecs ? toVectorLiteral(vecs[idx]) : null,
    }));
    await sb.from("document_chunks").insert(rows);
  } catch (e) {
    console.error(`[artifacts] indexar RAG falhou (${artifactId}):`, e);
  }
}
