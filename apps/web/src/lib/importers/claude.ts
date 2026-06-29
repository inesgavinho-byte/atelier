import {
  flattenContent,
  normRole,
  toIso,
  type ConversationImport,
} from "@/lib/importers/common";

/**
 * Parser for the Claude.ai export (Settings → Export data).
 *
 * Shape: conversations.json is an array of conversations, each
 *   { uuid, name, created_at, updated_at, chat_messages: [{ uuid, sender, text }] }
 * (some exports use `content` blocks instead of `text`).
 */
export function parseClaude(json: unknown): ConversationImport[] {
  const list = Array.isArray(json)
    ? json
    : Array.isArray((json as { conversations?: unknown })?.conversations)
      ? (json as { conversations: unknown[] }).conversations
      : [];

  const out: ConversationImport[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, any>;
    const msgs = Array.isArray(c.chat_messages) ? c.chat_messages : [];
    const messages = msgs
      .map((m: Record<string, any>) => ({
        role: normRole(m.sender ?? m.role),
        content: flattenContent(m.text ?? m.content).trim(),
        at: toIso(m.created_at),
      }))
      .filter((m: { content: string }) => m.content);
    if (!messages.length) continue;

    out.push({
      source: "claude",
      externalId: String(c.uuid ?? c.id ?? ""),
      title: String(c.name ?? "(sem título)").trim() || "(sem título)",
      messages,
      createdAt: toIso(c.created_at),
      updatedAt: toIso(c.updated_at ?? c.created_at),
    });
  }
  return out;
}

/** Heuristic: does this JSON look like a Claude.ai export? */
export function looksLikeClaude(json: unknown): boolean {
  const first = Array.isArray(json)
    ? json[0]
    : (json as { conversations?: unknown[] })?.conversations?.[0];
  return Boolean(first && typeof first === "object" && "chat_messages" in (first as object));
}
