import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the network/env seams before importing the module under test.
vi.mock("@/lib/ai/embeddings", () => ({
  embedText: vi.fn(),
  embedTexts: vi.fn(),
  toVectorLiteral: (v: number[]) => `[${v.join(",")}]`,
}));
vi.mock("@/lib/supabase", () => ({ getSupabase: vi.fn() }));

import { retrieveRelevantChunks } from "@/lib/documents";
import { embedText } from "@/lib/ai/embeddings";
import { getSupabase } from "@/lib/supabase";

type AnyFn = ReturnType<typeof vi.fn>;

/** A chainable Supabase client mock: rpc + from(...).select().eq().or().limit(). */
function makeClient(opts: { rpcResult?: { data: unknown; error: unknown }; rows?: unknown[] }) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "or", "ilike", "gte", "is", "order"]) {
    builder[m] = () => builder;
  }
  builder.limit = () => Promise.resolve({ data: opts.rows ?? [] });
  return {
    rpc: vi.fn(async () => opts.rpcResult ?? { data: null, error: null }),
    from: vi.fn(() => builder),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("retrieveRelevantChunks", () => {
  it("returns semantic hits ordered by the RPC when an embedding is available", async () => {
    (embedText as AnyFn).mockResolvedValue([0.1, 0.2, 0.3]);
    const client = makeClient({
      rpcResult: {
        data: [
          { document_id: "d1", document_title: "Doc A", idx: 0, content: "primeiro", similarity: 0.9 },
          { document_id: "d2", document_title: "Doc B", idx: 3, content: "segundo", similarity: 0.7 },
        ],
        error: null,
      },
    });
    (getSupabase as AnyFn).mockReturnValue(client);

    const hits = await retrieveRelevantChunks("ws-1", "o que é pgvector", 5);
    expect(client.rpc).toHaveBeenCalledWith("match_document_chunks", expect.any(Object));
    expect(hits.map((h) => h.documentId)).toEqual(["d1", "d2"]);
    expect(hits[0].documentTitle).toBe("Doc A");
    expect(hits[1].content).toBe("segundo");
  });

  it("returns an empty array when nothing matches (semantic + keyword)", async () => {
    (embedText as AnyFn).mockResolvedValue([0.1, 0.2, 0.3]);
    // RPC yields nothing → falls through to keyword, which also yields nothing.
    const client = makeClient({ rpcResult: { data: [], error: null }, rows: [] });
    (getSupabase as AnyFn).mockReturnValue(client);

    const hits = await retrieveRelevantChunks("ws-1", "termo inexistente qualquer", 5);
    expect(hits).toEqual([]);
  });

  it("falls back to keyword (ILIKE) retrieval without OPENAI_API_KEY — no crash", async () => {
    (embedText as AnyFn).mockResolvedValue(null); // no embeddings available
    const client = makeClient({
      rows: [
        { document_id: "d9", idx: 1, content: "mereologia é o estudo das relações", documents: { title: "Notas" } },
      ],
    });
    (getSupabase as AnyFn).mockReturnValue(client);

    const hits = await retrieveRelevantChunks("ws-1", "mereologia relações", 5);
    expect(client.rpc).not.toHaveBeenCalled(); // never tried the RPC
    expect(hits).toHaveLength(1);
    expect(hits[0].documentId).toBe("d9");
    expect(hits[0].documentTitle).toBe("Notas");
  });

  it("returns [] when Supabase is not configured", async () => {
    (embedText as AnyFn).mockResolvedValue([0.1]);
    (getSupabase as AnyFn).mockReturnValue(null);
    expect(await retrieveRelevantChunks("ws-1", "qualquer", 5)).toEqual([]);
  });
});
