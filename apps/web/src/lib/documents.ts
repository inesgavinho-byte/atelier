import "server-only";
import { getSupabase } from "@/lib/supabase";
import { embedText, cosineSimilarity } from "@/lib/ai/embeddings";

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

/** A document a grounded answer drew on (shown to the user as a source). */
export interface DocSource {
  documentId: string;
  documentTitle: string;
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

/**
 * List a workspace's documents, optionally scoped to a project.
 *
 * - `scope.projectId` a string → only that project's documents.
 * - `scope.projectId === null` → only workspace-level documents (no project),
 *   so the general workspace library doesn't include project-scoped files.
 * - omitted → every document in the workspace (backwards compatible).
 */
export async function getDocuments(
  workspaceId: string,
  scope?: { projectId?: string | null }
): Promise<WorkspaceDocument[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from("documents")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (scope && "projectId" in scope) {
    q = scope.projectId
      ? q.eq("project_id", scope.projectId)
      : q.is("project_id", null);
  }
  const { data } = await q.order("created_at", { ascending: false });
  return (data ?? []).map(toDoc);
}

// Common pt-PT / en stopwords; combined with a length filter to keep only
// content-bearing terms for retrieval.
const STOPWORDS = new Set([
  "para", "como", "porque", "sobre", "quais", "qual", "entre", "este", "esta",
  "isto", "esse", "essa", "aquele", "aquela", "com", "sem", "dos", "das", "uma",
  "umas", "uns", "pelo", "pela", "mais", "menos", "onde", "quando", "então",
  "também", "ser", "estar", "que", "não", "sim", "the", "this", "that", "with",
  "from", "what", "which", "have", "your", "você", "quero", "podes", "fazer",
  "muito", "pouco", "sou", "são", "tem", "têm", "foi", "será",
]);

/** Extract distinct content-bearing terms from a natural-language query. */
function queryTerms(query: string, max = 8): string[] {
  const seen = new Set<string>();
  // Keep latin letters (incl. pt accents à-ÿ), digits and spaces; drop the rest.
  for (const raw of query.toLowerCase().replace(/[^a-z0-9à-ÿ\s]/g, " ").split(/\s+/)) {
    if (raw.length >= 4 && !STOPWORDS.has(raw)) seen.add(raw);
    if (seen.size >= max) break;
  }
  return Array.from(seen);
}

/**
 * Lexical fallback: candidate chunks contain a query term, scored by how many
 * distinct terms they contain. Used when embeddings are unavailable (no
 * OPENAI_API_KEY, or chunks ingested before RAG v2).
 */
async function keywordRetrieveChunks(
  workspaceId: string,
  query: string,
  k: number
): Promise<ChunkHit[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const orFilter = terms.map((t) => `content.ilike.%${t}%`).join(",");
  const { data } = await sb
    .from("document_chunks")
    .select("document_id, idx, content, documents(title)")
    .eq("workspace_id", workspaceId)
    .or(orFilter)
    .limit(40);
  return (data ?? [])
    .map((r: any) => {
      const c = String(r.content).toLowerCase();
      const score = terms.reduce((n, t) => n + (c.includes(t) ? 1 : 0), 0);
      return {
        documentId: r.document_id,
        documentTitle: r.documents?.title ?? "(documento)",
        idx: r.idx,
        content: r.content as string,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ documentId, documentTitle, idx, content }) => ({
      documentId,
      documentTitle,
      idx,
      content,
    }));
}

// Below this cosine score a chunk is treated as not relevant enough to inject.
const SEMANTIC_FLOOR = 0.2;

/**
 * Retrieve the document chunks most relevant to a question (RAG v2 — semantic).
 * Embeds the query and ranks the workspace's embedded chunks by cosine
 * similarity; falls back to keyword retrieval when embeddings aren't available
 * (no key, or chunks ingested before embeddings existed). Grounds the Council's
 * answers in the workspace's own documents. Returns [] when nothing matches.
 */
export async function retrieveRelevantChunks(
  workspaceId: string,
  query: string,
  k = 5
): Promise<ChunkHit[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const queryVec = await embedText(query);
  if (queryVec) {
    const { data } = await sb
      .from("document_chunks")
      .select("document_id, idx, content, embedding, documents(title)")
      .eq("workspace_id", workspaceId)
      .not("embedding", "is", null)
      .limit(500);
    const scored = (data ?? [])
      .map((r: any) => {
        const emb = Array.isArray(r.embedding) ? (r.embedding as number[]) : null;
        return {
          documentId: r.document_id,
          documentTitle: r.documents?.title ?? "(documento)",
          idx: r.idx,
          content: r.content as string,
          score: emb ? cosineSimilarity(queryVec, emb) : 0,
        };
      })
      .filter((x) => x.score >= SEMANTIC_FLOOR)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    if (scored.length)
      return scored.map(({ documentId, documentTitle, idx, content }) => ({
        documentId,
        documentTitle,
        idx,
        content,
      }));
    // Nothing semantically close — fall through to keyword.
  }

  return keywordRetrieveChunks(workspaceId, query, k);
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
