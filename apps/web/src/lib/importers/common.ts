/**
 * ATELIER — batch importer common types & utilities (client-safe).
 *
 * Each platform parser turns its export format into the same neutral shape,
 * `ConversationImport[]`, so the rest of the pipeline (preview, auto-map,
 * extraction, merge) is platform-agnostic. Timestamps are ISO strings so the
 * shape survives the server↔client boundary unchanged.
 */

export type ImportSource = "claude" | "chatgpt" | "perplexity";

export interface ConvMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO timestamp. */
  at: string;
}

export interface ConversationImport {
  source: ImportSource;
  /** Stable id from the source platform — used for deduplication. */
  externalId: string;
  title: string;
  messages: ConvMessage[];
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** Hard caps (see spec). */
export const MAX_CONVERSATIONS_PER_UPLOAD = 500;
export const MAX_SELECTED_PER_BATCH = 100;
export const WORD_LIMIT = 50_000;
export const TRUNCATE_WORDS = 20_000;

/** Normalise a role string onto user/assistant (assistant is the default). */
export function normRole(role: unknown): "user" | "assistant" {
  const r = String(role ?? "").toLowerCase();
  if (r === "user" || r === "human") return "user";
  return "assistant";
}

/** Coerce a value (string | number seconds | ISO) into an ISO timestamp. */
export function toIso(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    // ChatGPT/Perplexity use epoch seconds (sometimes with a fractional part).
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date(0).toISOString();
}

/** Flatten a message content that may be a string, parts[] or a rich object. */
export function flattenContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        typeof p === "string"
          ? p
          : p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string"
            ? (p as { text: string }).text
            : ""
      )
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object") {
    const c = content as { parts?: unknown; text?: unknown };
    if (Array.isArray(c.parts)) {
      return c.parts.filter((x): x is string => typeof x === "string").join("\n");
    }
    if (typeof c.text === "string") return c.text;
  }
  return "";
}

/** A readable transcript from a conversation's messages. */
export function transcriptOf(conv: ConversationImport): string {
  return conv.messages
    .map((m) => `${m.role === "user" ? "Utilizador" : "Assistente"}: ${m.content}`)
    .filter((l) => l.trim())
    .join("\n\n");
}

/** Word count of a string. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Truncate a transcript to TRUNCATE_WORDS when it exceeds WORD_LIMIT. Returns
 * the (possibly shortened) text and whether it was truncated.
 */
export function clampTranscript(text: string): { text: string; truncated: boolean } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= WORD_LIMIT) return { text, truncated: false };
  return { text: words.slice(0, TRUNCATE_WORDS).join(" "), truncated: true };
}
