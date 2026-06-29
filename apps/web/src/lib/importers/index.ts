import {
  MAX_CONVERSATIONS_PER_UPLOAD,
  type ConversationImport,
  type ImportSource,
} from "@/lib/importers/common";
import { looksLikeClaude, parseClaude } from "@/lib/importers/claude";
import { looksLikeChatGPT, parseChatGPT } from "@/lib/importers/chatgpt";
import { looksLikePerplexity, parsePerplexity } from "@/lib/importers/perplexity";

export * from "@/lib/importers/common";

export interface ParsedUpload {
  source: ImportSource;
  conversations: ConversationImport[];
  /** True when the upload exceeded MAX_CONVERSATIONS_PER_UPLOAD and was cut. */
  truncated: boolean;
}

/** Ensure every conversation has a stable, non-empty externalId. */
function fillIds(convs: ConversationImport[]): ConversationImport[] {
  return convs.map((c, i) =>
    c.externalId
      ? c
      : { ...c, externalId: `${c.source}-${i}-${c.createdAt}-${c.title.slice(0, 24)}` }
  );
}

/**
 * Detect the platform from a parsed JSON export and normalise it to
 * ConversationImport[]. Returns null when no parser recognises the shape.
 */
export function parseExport(json: unknown): ParsedUpload | null {
  let source: ImportSource | null = null;
  let conversations: ConversationImport[] = [];

  if (looksLikeClaude(json)) {
    source = "claude";
    conversations = parseClaude(json);
  } else if (looksLikeChatGPT(json)) {
    source = "chatgpt";
    conversations = parseChatGPT(json);
  } else if (looksLikePerplexity(json)) {
    source = "perplexity";
    conversations = parsePerplexity(json);
  } else {
    // Last resort: try each and take the first that yields conversations.
    for (const [s, fn] of [
      ["claude", parseClaude],
      ["chatgpt", parseChatGPT],
      ["perplexity", parsePerplexity],
    ] as const) {
      const parsed = fn(json);
      if (parsed.length) {
        source = s;
        conversations = parsed;
        break;
      }
    }
  }

  if (!source || !conversations.length) return null;

  const truncated = conversations.length > MAX_CONVERSATIONS_PER_UPLOAD;
  return {
    source,
    conversations: fillIds(conversations).slice(0, MAX_CONVERSATIONS_PER_UPLOAD),
    truncated,
  };
}
