"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import {
  chunkMarkdown,
  convertBinaryToMarkdown,
  convertToMarkdown,
  isTextKind,
  searchDocumentChunks,
  type ChunkHit,
} from "@/lib/documents";
import { embedTexts } from "@/lib/ai/embeddings";
import { recordTimelineEvent } from "@/lib/timeline";

/**
 * Add a document to a workspace (Bloco 5). Text-like content is converted to
 * canonical Markdown in-process. Binaries (PDF/Office/images) are sent to the
 * MarkItDown service when MARKITDOWN_URL is configured; if it isn't (or the
 * call fails) they are stored as 'pending_conversion' as before. The UI never
 * calls an LLM here — this is deterministic ingestion.
 */
export async function addDocument(input: {
  workspaceId: string;
  projectId?: string;
  title: string;
  sourceName?: string;
  kind?: string;
  /** Extracted text for text-like files; omit for binaries. */
  text?: string;
  /** Base64-encoded bytes for binaries (PDF/Office/images). */
  base64?: string;
  mime?: string;
}): Promise<{ ok: boolean; id?: string; chunks?: number; status?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const title = input.title.trim() || input.sourceName?.trim() || "Documento";

  // Text-like files convert in-process; binaries go through MarkItDown when it
  // is configured, otherwise they wait as `pending_conversion`.
  let markdown = "";
  if (isTextKind(input.kind) && typeof input.text === "string") {
    markdown = convertToMarkdown(input.text);
  } else if (input.base64) {
    const converted = await convertBinaryToMarkdown(
      Buffer.from(input.base64, "base64"),
      input.sourceName || title,
      input.mime
    );
    if (converted) markdown = converted.markdown;
  }
  const status = markdown ? "ready" : "pending_conversion";

  const { data, error } = await sb
    .from("documents")
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId || null,
      title,
      source_name: input.sourceName || null,
      kind: input.kind || null,
      markdown,
      char_count: markdown.length,
      status,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  const documentId = data.id as string;
  let chunks = 0;
  if (markdown) {
    const parts = chunkMarkdown(markdown);
    if (parts.length) {
      // Embed each chunk for semantic retrieval (RAG v2). Degrades to null —
      // chunks then store no vector and fall back to keyword search.
      const vectors = await embedTexts(parts);
      const rows = parts.map((content, idx) => ({
        document_id: documentId,
        workspace_id: input.workspaceId,
        idx,
        content,
        embedding: vectors ? vectors[idx] : null,
      }));
      const { error: chunkErr } = await sb.from("document_chunks").insert(rows);
      if (!chunkErr) chunks = rows.length;
    }
  }

  await recordTimelineEvent({
    workspaceId: input.workspaceId,
    projectId: input.projectId || null,
    kind: "document",
    title: `Documento: ${title}`,
    body: status === "ready" ? `${chunks} secções` : "conversão pendente",
    actor: "user",
  }).catch(() => {});

  revalidatePath(`/workspaces/${input.workspaceId}`);
  return {
    ok: true,
    id: documentId,
    chunks,
    status,
    message:
      status === "ready"
        ? `Documento processado — ${chunks} ${chunks === 1 ? "secção" : "secções"}.`
        : "Documento guardado em fila — conversão (PDF/Office) pendente do serviço MarkItDown.",
  };
}

export async function deleteDocument(input: {
  id: string;
  workspaceId: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const { error } = await sb.from("documents").delete().eq("id", input.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, message: "Documento eliminado." };
}

/** Keyword search over a workspace's documents. */
export async function searchWorkspaceDocuments(
  workspaceId: string,
  query: string
): Promise<ChunkHit[]> {
  return searchDocumentChunks(workspaceId, query);
}
