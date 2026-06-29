import "server-only";
import { readEnv } from "@/lib/ai/providers/http";

/**
 * Embeddings for semantic document search (RAG v2). Uses OpenAI
 * text-embedding-3-small (1536 dims) — cheap and good. Degrades to null when
 * OPENAI_API_KEY is absent or the call fails, so the document pipeline falls
 * back to keyword retrieval without breaking.
 */

const MODEL = process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small";

/** Embed a batch of texts. Returns vectors aligned to input, or null. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const key = readEnv("OPENAI_API_KEY");
  if (!key || texts.length === 0) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input: texts }),
    });
    if (!res.ok) {
      console.error(`[embeddings] OpenAI HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      data?: { embedding: number[]; index: number }[];
    };
    const rows = data.data ?? [];
    if (rows.length !== texts.length) return null;
    // Order by index to stay aligned with the input array.
    const out: number[][] = new Array(texts.length);
    for (const r of rows) out[r.index] = r.embedding;
    return out.every(Boolean) ? out : null;
  } catch (e) {
    console.error("[embeddings] falhou:", e);
    return null;
  }
}

/** Embed a single text. Returns the vector or null. */
export async function embedText(text: string): Promise<number[] | null> {
  const batch = await embedTexts([text]);
  return batch ? batch[0] : null;
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
