import {
  flattenContent,
  normRole,
  toIso,
  type ConvMessage,
  type ConversationImport,
} from "@/lib/importers/common";

/**
 * Parser for the Perplexity export (Settings → Export → JSON).
 *
 * Perplexity's format is the least standardised: an array of threads, each with
 * a title and either a `messages` array ({ role, content }) or query/answer
 * pairs ({ query, answer }). Both shapes are handled, best-effort.
 */
function messagesOf(thread: Record<string, any>): ConvMessage[] {
  if (Array.isArray(thread.messages)) {
    return thread.messages
      .filter((m: unknown): m is Record<string, any> => Boolean(m) && typeof m === "object")
      .map((m: Record<string, any>) => ({
        role: normRole(m.role ?? m.author),
        content: flattenContent(m.content ?? m.text).trim(),
        at: toIso(m.created_at ?? m.timestamp ?? thread.created_at),
      }))
      .filter((m: { content: string }) => m.content);
  }
  // query/answer pairs (entries[] or the thread itself).
  const entries = Array.isArray(thread.entries) ? thread.entries : [thread];
  const msgs: ConvMessage[] = [];
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    const at = toIso(e.created_at ?? thread.created_at);
    const query = flattenContent(e.query ?? e.question).trim();
    const answer = flattenContent(e.answer ?? e.response).trim();
    if (query) msgs.push({ role: "user", content: query, at });
    if (answer) msgs.push({ role: "assistant", content: answer, at });
  }
  return msgs;
}

export function parsePerplexity(json: unknown): ConversationImport[] {
  const list = Array.isArray(json)
    ? json
    : Array.isArray((json as { threads?: unknown })?.threads)
      ? (json as { threads: unknown[] }).threads
      : [];

  const out: ConversationImport[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const t = raw as Record<string, any>;
    const messages = messagesOf(t);
    if (!messages.length) continue;

    out.push({
      source: "perplexity",
      externalId: String(t.uuid ?? t.id ?? ""),
      title:
        String(t.title ?? t.name ?? messages[0]?.content.slice(0, 60) ?? "(sem título)").trim() ||
        "(sem título)",
      messages,
      createdAt: toIso(t.created_at),
      updatedAt: toIso(t.updated_at ?? t.created_at),
    });
  }
  return out;
}

/** Heuristic: does this JSON look like a Perplexity export? */
export function looksLikePerplexity(json: unknown): boolean {
  const first = Array.isArray(json)
    ? json[0]
    : (json as { threads?: unknown[] })?.threads?.[0];
  if (!first || typeof first !== "object") return false;
  const o = first as object;
  return "query" in o || "answer" in o || "entries" in o || "threads" in o;
}
