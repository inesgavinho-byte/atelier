import {
  flattenContent,
  normRole,
  toIso,
  type ConvMessage,
  type ConversationImport,
} from "@/lib/importers/common";

/**
 * Parser for the ChatGPT export (Settings → Data controls → Export data).
 *
 * Shape: conversations.json is an array of conversations. Messages live either
 * in a `mapping` (object of nodes, each with message.author.role +
 * message.content.parts and a create_time) or, in some exports, a `messages`
 * object/array. Both are handled and ordered by create_time.
 */
function messagesFromMapping(mapping: Record<string, any>): ConvMessage[] {
  return Object.values(mapping)
    .map((node) => node?.message)
    .filter((m) => m && typeof m === "object")
    .sort((a, b) => (a.create_time ?? 0) - (b.create_time ?? 0))
    .map((m) => ({
      role: normRole(m.author?.role ?? m.role),
      content: flattenContent(m.content).trim(),
      at: toIso(m.create_time),
    }))
    .filter((m) => m.content && m.content !== "");
}

function messagesFromObject(messages: unknown): ConvMessage[] {
  const arr = Array.isArray(messages) ? messages : Object.values(messages as object);
  return arr
    .filter((m): m is Record<string, any> => Boolean(m) && typeof m === "object")
    .sort((a, b) => (a.create_time ?? 0) - (b.create_time ?? 0))
    .map((m) => ({
      role: normRole(m.author?.role ?? m.role),
      content: flattenContent(m.content).trim(),
      at: toIso(m.create_time),
    }))
    .filter((m) => m.content);
}

export function parseChatGPT(json: unknown): ConversationImport[] {
  const list = Array.isArray(json)
    ? json
    : Array.isArray((json as { conversations?: unknown })?.conversations)
      ? (json as { conversations: unknown[] }).conversations
      : [];

  const out: ConversationImport[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, any>;
    const messages =
      c.mapping && typeof c.mapping === "object"
        ? messagesFromMapping(c.mapping)
        : c.messages
          ? messagesFromObject(c.messages)
          : [];
    if (!messages.length) continue;

    out.push({
      source: "chatgpt",
      externalId: String(c.id ?? c.conversation_id ?? ""),
      title: String(c.title ?? "(sem título)").trim() || "(sem título)",
      messages,
      createdAt: toIso(c.create_time),
      updatedAt: toIso(c.update_time ?? c.create_time),
    });
  }
  return out;
}

/** Heuristic: does this JSON look like a ChatGPT export? */
export function looksLikeChatGPT(json: unknown): boolean {
  const first = Array.isArray(json) ? json[0] : undefined;
  return Boolean(
    first &&
      typeof first === "object" &&
      ("mapping" in (first as object) || "create_time" in (first as object))
  );
}
