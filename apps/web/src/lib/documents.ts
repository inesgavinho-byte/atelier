import "server-only";
import { getSupabase } from "@/lib/supabase";

/**
 * ATELIER — document pipeline (Bloco 5, Node-first).
 *
 * A document becomes canonical Markdown, then keyword-searchable chunks. The
 * conversion is a seam: today it handles text/markdown directly and queues
 * binaries (PDF/Office) for the future MarkItDown service; swapping the
 * converter doesn't change the rest of the pipeline.
 */

export interface WorkspaceDocument {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  sourceName?: string;
  kind?: string;
  charCount: number;
  status: "ready" | "pending_conversion";
  createdAt: string;
}

export interface ChunkHit {
  documentId: string;
  documentTitle: string;
  idx: number;
  content: string;
}

const toDoc = (r: any): WorkspaceDocument => ({
  id: r.id,
  workspaceId: r.workspace_id,
  projectId: r.project_id ?? undefined,
  title: r.title,
  sourceName: r.source_name ?? undefined,
  kind: r.kind ?? undefined,
  charCount: r.char_count ?? 0,
  status: r.status,
  createdAt: r.created_at,
});

/** Text-like kinds we can turn into Markdown in-process (Node-first). */
const TEXT_KINDS = ["txt", "md", "markdown", "csv", "json", "log", "text"];

export function isTextKind(kind?: string): boolean {
  if (!kind) return false;
  const k = kind.toLowerCase();
  return TEXT_KINDS.some((t) => k === t || k.includes(t));
}

/**
 * Convert raw text to canonical Markdown. v1 normalises line endings and
 * trims; the MarkItDown (OCR/Office) path will replace this for binaries.
 */
export function convertToMarkdown(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Convert a binary document (PDF/Office/image) to Markdown via the MarkItDown
 * service (apps/markitdown on Railway). Returns null when the service isn't
 * configured (MARKITDOWN_URL unset) or the call fails — the caller then keeps
 * the document as `pending_conversion`, so the whole feature degrades
 * gracefully without the service.
 */
export async function convertBinaryToMarkdown(
  bytes: Buffer,
  sourceName: string,
  mime?: string
): Promise<{ markdown: string } | null> {
  const base = process.env.MARKITDOWN_URL?.replace(/\/$/, "");
  if (!base) return null;
  const token = process.env.MARKITDOWN_TOKEN;
  try {
    const form = new FormData();
    const blob = new Blob([bytes], {
      type: mime || "application/octet-stream",
    });
    form.append("file", blob, sourceName);
    const res = await fetch(`${base}/convert`, {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) {
      console.error(`[markitdown] HTTP ${res.status} para ${sourceName}`);
      return null;
    }
    const data = (await res.json()) as { markdown?: string };
    const markdown = (data.markdown ?? "").trim();
    return markdown ? { markdown } : null;
  } catch (e) {
    console.error("[markitdown] chamada falhou:", e);
    return null;
  }
}

/** Split Markdown into ~800-char chunks on paragraph boundaries. */
export function chunkMarkdown(markdown: string, target = 800): string[] {
  const paras = markdown.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paras) {
    if (buf && buf.length + p.length + 2 > target) {
      chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
    // A single huge paragraph still becomes its own (possibly long) chunk.
    if (buf.length >= target) {
      chunks.push(buf);
      buf = "";
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export async function getDocuments(
  workspaceId: string
): Promise<WorkspaceDocument[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("documents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(toDoc);
}

/** Keyword search over a workspace's document chunks (ILIKE; v1). */
export async function searchDocumentChunks(
  workspaceId: string,
  query: string,
  limit = 20
): Promise<ChunkHit[]> {
  const q = query.trim();
  const sb = getSupabase();
  if (!sb || q.length < 2) return [];
  const { data } = await sb
    .from("document_chunks")
    .select("document_id, idx, content, documents(title)")
    .eq("workspace_id", workspaceId)
    .ilike("content", `%${q}%`)
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    documentId: r.document_id,
    documentTitle: r.documents?.title ?? "(documento)",
    idx: r.idx,
    content: r.content,
  }));
}
