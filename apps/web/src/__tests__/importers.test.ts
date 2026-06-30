import { describe, it, expect } from "vitest";
import { parseExport } from "@/lib/importers";

/**
 * The three platform parsers normalise their export JSON into the neutral
 * ConversationImport[] shape. parseExport detects the platform and returns
 * null (never throws) for anything it doesn't recognise.
 */

describe("parseExport — Claude", () => {
  const json = [
    {
      uuid: "c-1",
      name: "Sobre mereologia",
      created_at: "2026-01-01T10:00:00Z",
      updated_at: "2026-01-01T10:05:00Z",
      chat_messages: [
        { sender: "human", text: "o que é mereologia?" },
        { sender: "assistant", text: "É o estudo das relações parte-todo." },
      ],
    },
  ];
  it("recognises and normalises a Claude export", () => {
    const r = parseExport(json);
    expect(r?.source).toBe("claude");
    expect(r?.conversations).toHaveLength(1);
    const c = r!.conversations[0];
    expect(c.title).toBe("Sobre mereologia");
    expect(c.externalId).toBe("c-1");
    expect(c.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(c.messages[0].content).toContain("mereologia");
  });
});

describe("parseExport — ChatGPT", () => {
  const json = [
    {
      id: "g-1",
      title: "Função TS",
      create_time: 1_700_000_000,
      mapping: {
        n1: {
          message: {
            author: { role: "user" },
            content: { parts: ["cria uma função"] },
            create_time: 1,
          },
        },
        n2: {
          message: {
            author: { role: "assistant" },
            content: { parts: ["aqui tens"] },
            create_time: 2,
          },
        },
      },
    },
  ];
  it("recognises and normalises a ChatGPT export (mapping)", () => {
    const r = parseExport(json);
    expect(r?.source).toBe("chatgpt");
    expect(r?.conversations).toHaveLength(1);
    const c = r!.conversations[0];
    expect(c.title).toBe("Função TS");
    // Ordered by create_time.
    expect(c.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(c.messages[1].content).toBe("aqui tens");
  });
});

describe("parseExport — Perplexity", () => {
  const json = [
    {
      id: "p-1",
      title: "Pesquisa",
      created_at: "2026-02-02T08:00:00Z",
      entries: [{ query: "o que é pgvector?", answer: "Uma extensão do Postgres." }],
    },
  ];
  it("recognises and normalises a Perplexity export (query/answer)", () => {
    const r = parseExport(json);
    expect(r?.source).toBe("perplexity");
    expect(r?.conversations).toHaveLength(1);
    const c = r!.conversations[0];
    expect(c.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(c.messages[0].content).toContain("pgvector");
    expect(c.messages[1].content).toContain("Postgres");
  });
});

describe("parseExport — graceful failures (no crash)", () => {
  it("returns null for an unrecognised object", () => {
    expect(parseExport({ random: "shape" })).toBeNull();
  });
  it("returns null for null / primitives", () => {
    expect(parseExport(null)).toBeNull();
    expect(parseExport(42)).toBeNull();
    expect(parseExport("just a string")).toBeNull();
  });
  it("returns null for an empty array", () => {
    expect(parseExport([])).toBeNull();
  });
  it("returns null for conversations with no usable messages", () => {
    expect(parseExport([{ uuid: "x", name: "vazio", chat_messages: [] }])).toBeNull();
  });
});
