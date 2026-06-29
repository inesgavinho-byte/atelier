"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import {
  chunkMarkdown,
  convertToMarkdown,
  isTextKind,
  searchDocumentChunks,
  type ChunkHit,
} from "@/lib/documents";

/**
 * Add a document to a workspace (Bloco 5). Text-like content is converted to
 * canonical Markdown and chunked for keyword search now; binaries are stored
 * as 'pending_conversion' for the future MarkItDown service. The UI never calls
 * an LLM here — this is deterministic ingestion.
 */
export async function addDocument(input: {
  workspaceId: string;
  projectId?: string;
  title: string;
  sourceName?: string;
  kind?: string;
  /** Extracted text for text-like files; omit for binaries. */
  text?: string;
}): Promise<{ ok: boolean; id?: string; chunks?: number; status?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const title = input.title.trim() || input.sourceName?.trim() || "Documento";
  const canText = isTextKind(input.kind) && typeof input.text === "string";
  const markdown = canText ? convertToMarkdown(input.text as string) : "";
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
      const rows = parts.map((content, idx) => ({
        document_id: documentId,
        workspace_id: input.workspaceId,
        idx,
        content,
      }));
      const { error: chunkErr } = await sb.from("document_chunks").insert(rows);
      if (!chunkErr) chunks = rows.length;
    }
  }

  revalidatePath(`/workspaces/${input.workspaceId}`);
  return {
    ok: true,
    id: documentId,
    chunks,
    status,
    message:
      status === "ready"
        ? `Documento processado — ${chunks} ${chunks === 1 ? "secção" : "secções"}.`
        : "Documento guardado — conversão (PDF/Office) fica para o serviço MarkItDown.",
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
