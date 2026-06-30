import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "@/lib/documents";

/**
 * chunkMarkdown packs paragraphs (split on blank lines) into ~800-char chunks,
 * pushing the buffer before it would exceed the target.
 */
describe("chunkMarkdown", () => {
  it("returns an empty array for empty / whitespace input", () => {
    expect(chunkMarkdown("")).toEqual([]);
    expect(chunkMarkdown("   \n\n  ")).toEqual([]);
  });

  it("keeps short text as a single chunk", () => {
    const chunks = chunkMarkdown("Um parágrafo curto.\n\nOutro parágrafo curto.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain("Um parágrafo curto.");
    expect(chunks[0]).toContain("Outro parágrafo curto.");
  });

  it("splits multi-paragraph text into ≤800-char chunks", () => {
    // 20 paragraphs of ~120 chars each → several chunks, each within target.
    const para = "Lorem ipsum dolor sit amet ".repeat(5).trim(); // ~135 chars
    const chunks = chunkMarkdown(Array.from({ length: 20 }, () => para).join("\n\n"));
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(800);
      expect(c.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps a fenced code block (no blank lines inside) in one chunk", () => {
    const md = [
      "Texto antes do bloco.",
      "```ts\nconst a = 1;\nconst b = 2;\nconsole.log(a + b);\n```",
      "Texto depois do bloco.",
    ].join("\n\n");
    const chunks = chunkMarkdown(md);
    const fenceChunk = chunks.find((c) => c.includes("```ts"));
    expect(fenceChunk).toBeDefined();
    // The opening and closing fences live in the same chunk (not split mid-block).
    expect(fenceChunk!.indexOf("```ts")).toBeGreaterThanOrEqual(0);
    expect(fenceChunk!.lastIndexOf("```")).toBeGreaterThan(fenceChunk!.indexOf("```ts"));
  });

  it("produces multiple valid chunks for very long text (>10k chars)", () => {
    const para = "Frase de teste para o chunking semântico do ATELIER.".repeat(4); // ~210 chars
    const chunks = chunkMarkdown(Array.from({ length: 60 }, () => para).join("\n\n"));
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.trim().length).toBeGreaterThan(0);
      expect(c.length).toBeLessThanOrEqual(800);
    }
    // No content is dropped: concatenated chunk length ≈ input (minus joiners).
    const total = chunks.reduce((n, c) => n + c.length, 0);
    expect(total).toBeGreaterThan(10_000);
  });
});
