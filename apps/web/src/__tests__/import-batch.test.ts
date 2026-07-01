import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { parseUpload, jsonCandidatesFromUpload } from "@/lib/import-batch";

/**
 * Upload → parse. A ZIP can hold several JSON files; the real conversations
 * file must win over decoys like the (often empty) shared_conversations.json.
 */

const claudeExport = [
  {
    uuid: "c-1",
    name: "Sobre pgvector",
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-01-01T10:05:00Z",
    chat_messages: [
      { sender: "human", text: "o que é pgvector?" },
      { sender: "assistant", text: "uma extensão do Postgres" },
    ],
  },
];

function u8(json: unknown): Uint8Array {
  return strToU8(JSON.stringify(json));
}

describe("parseUpload — ZIP file selection", () => {
  it("picks conversations.json over an empty shared_conversations.json", () => {
    // Insertion order puts the decoy first — the old code picked it and failed.
    const zip = zipSync({
      "shared_conversations.json": u8([]),
      "user.json": u8({ email: "ines@example.com" }),
      "conversations.json": u8(claudeExport),
    });
    const parsed = parseUpload("export.zip", zip);
    expect(parsed?.source).toBe("claude");
    expect(parsed?.conversations).toHaveLength(1);
    expect(parsed?.conversations[0].title).toBe("Sobre pgvector");
  });

  it("handles a folder-prefixed conversations.json inside the ZIP", () => {
    const zip = zipSync({ "export/conversations.json": u8(claudeExport) });
    expect(parseUpload("export.zip", zip)?.source).toBe("claude");
  });

  it("falls back to any parseable JSON when there is no conversations.json", () => {
    const zip = zipSync({ "data.json": u8(claudeExport) });
    expect(parseUpload("export.zip", zip)?.conversations).toHaveLength(1);
  });

  it("parses a raw .json upload directly", () => {
    expect(parseUpload("conversations.json", u8(claudeExport))?.source).toBe("claude");
  });

  it("returns null for a ZIP whose JSONs are all unrecognised", () => {
    const zip = zipSync({ "notes.json": u8({ hello: "world" }) });
    expect(parseUpload("export.zip", zip)).toBeNull();
  });

  it("throws a clear error for a ZIP with no JSON files", () => {
    const zip = zipSync({ "readme.txt": strToU8("hello") });
    expect(() => parseUpload("export.zip", zip)).toThrow(/não contém/i);
  });

  it("jsonCandidatesFromUpload orders conversations.json first", () => {
    const zip = zipSync({
      "shared_conversations.json": u8([{ decoy: true }]),
      "conversations.json": u8(claudeExport),
    });
    const cands = jsonCandidatesFromUpload("export.zip", zip) as unknown[];
    // First candidate is the real conversations.json (an array of 1 convo).
    expect(Array.isArray(cands[0])).toBe(true);
    expect((cands[0] as unknown[]).length).toBe(1);
    expect((cands[0] as { uuid?: string }[])[0].uuid).toBe("c-1");
  });
});
