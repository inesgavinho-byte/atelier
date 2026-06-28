import "server-only";
import { gateway } from "@/lib/ai/gateway";
import type { ProviderId } from "@/lib/ai/types";

/**
 * ATELIER — importing conversations from other LLMs into a workspace's context.
 *
 * Two responsibilities, both server-only:
 *  1. Normalise an imported conversation (pasted text or an exported JSON file
 *     from Claude.ai / ChatGPT) into a plain-text transcript.
 *  2. Ask the Council (Claude Haiku — cheap) to extract decisions, artifacts,
 *     lessons and a summary from that transcript, as strict JSON.
 */

export interface ExtractedContext {
  decisions: string[];
  artifacts: string[];
  lessons: string[];
  summary: string;
}

export const IMPORT_SOURCES = ["claude", "chatgpt", "perplexity", "other"] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

/* ── Transcript normalisation ─────────────────────────────────────────────── */

function roleLabel(role: string): string {
  const r = role.toLowerCase();
  if (r === "user" || r === "human") return "Utilizador";
  if (r === "assistant" || r === "model" || r === "ai") return "Assistente";
  if (r === "system") return "Sistema";
  return role;
}

/** Pull readable text out of a message whose content may be a string or parts. */
function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const p = part as Record<string, unknown>;
          if (typeof p.text === "string") return p.text;
          // ChatGPT content_type: text → parts: string[]
          if (Array.isArray(p.parts)) return p.parts.filter((x) => typeof x === "string").join("\n");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (Array.isArray(c.parts)) {
      return c.parts.filter((x) => typeof x === "string").join("\n");
    }
    if (typeof c.text === "string") return c.text;
  }
  return "";
}

/**
 * Turn an exported JSON conversation into a transcript. Handles the two common
 * shapes — Claude.ai (chat_messages[] with {sender, text|content}) and ChatGPT
 * (mapping{} of nodes with message.author.role + message.content.parts) — plus
 * a generic messages[] fallback. Returns null when nothing usable is found.
 */
export function transcriptFromJson(json: unknown): string | null {
  const lines: string[] = [];

  const pushMsg = (role: string, text: string) => {
    const t = text.trim();
    if (t) lines.push(`${roleLabel(role)}: ${t}`);
  };

  // A single conversation object, or an array of them — take the first.
  const conv: any = Array.isArray(json) ? json[0] : json;
  if (!conv || typeof conv !== "object") return null;

  // Claude.ai export: { chat_messages: [{ sender, text | content }] }
  if (Array.isArray(conv.chat_messages)) {
    for (const m of conv.chat_messages) {
      pushMsg(m.sender ?? m.role ?? "", textFromContent(m.text ?? m.content));
    }
  }
  // ChatGPT export: { mapping: { id: { message: { author:{role}, content } } } }
  else if (conv.mapping && typeof conv.mapping === "object") {
    const nodes = Object.values(conv.mapping as Record<string, any>)
      .map((n) => n?.message)
      .filter(Boolean)
      .sort((a, b) => (a.create_time ?? 0) - (b.create_time ?? 0));
    for (const m of nodes) {
      pushMsg(m.author?.role ?? "", textFromContent(m.content));
    }
  }
  // Generic: { messages: [{ role, content }] }
  else if (Array.isArray(conv.messages)) {
    for (const m of conv.messages) {
      pushMsg(m.role ?? m.sender ?? "", textFromContent(m.content ?? m.text));
    }
  } else {
    return null;
  }

  return lines.length ? lines.join("\n\n") : null;
}

/**
 * Build a transcript from raw imported content. JSON is parsed and normalised;
 * anything else is treated as already-plain pasted text.
 */
export function toTranscript(raw: string, kind: "text" | "json"): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (kind === "json") {
    try {
      const parsed = JSON.parse(trimmed);
      return transcriptFromJson(parsed) ?? null;
    } catch {
      return null;
    }
  }
  return trimmed;
}

/* ── Extraction (Council — Claude Haiku) ──────────────────────────────────── */

const HAIKU = "claude-haiku-4-5-20251001";

function pickProvider(): { provider: ProviderId; model?: string } | null {
  const avail = new Map(gateway.availability().map((a) => [a.id, a.available]));
  if (avail.get("claude")) return { provider: "claude", model: HAIKU };
  if (avail.get("openai")) return { provider: "openai" };
  if (avail.get("perplexity")) return { provider: "perplexity" };
  return null;
}

const EXTRACT_PROMPT = `És o agente de contexto do ATELIER. Recebes a transcrição de uma conversa com outra IA. Extrai APENAS o que é relevante para a memória de um workspace.

Responde SÓ com JSON válido, sem texto à volta, neste formato exacto:
{
  "decisions": ["decisão tomada, uma por linha"],
  "artifacts": ["artefacto/documento mencionado"],
  "lessons": ["lição aprendida ou princípio"],
  "summary": "resumo curto da conversa (2-4 frases)"
}

Regras:
- Em português.
- Listas vazias [] quando não houver nada.
- Sê conciso e factual; não inventes.`;

function safeParseJson(text: string): ExtractedContext | null {
  let t = text.trim();
  // Strip ```json … ``` fences if present.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // Otherwise isolate the first {...} block.
  if (!t.startsWith("{")) {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) t = t.slice(start, end + 1);
  }
  try {
    const obj = JSON.parse(t) as Record<string, unknown>;
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
    return {
      decisions: arr(obj.decisions),
      artifacts: arr(obj.artifacts),
      lessons: arr(obj.lessons),
      summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
    };
  } catch {
    return null;
  }
}

/** Run the Council extraction over a transcript. Returns null when unavailable. */
export async function extractContext(
  transcript: string
): Promise<ExtractedContext | null> {
  const choice = pickProvider();
  if (!choice) return null;

  // Cap the transcript so a huge paste stays within a cheap request.
  const clipped = transcript.slice(0, 24000);

  const r = await gateway.run({
    provider: choice.provider,
    model: choice.model,
    maxTokens: 1024,
    temperature: 0,
    messages: [
      { role: "system", content: EXTRACT_PROMPT },
      { role: "user", content: clipped },
    ],
  });
  if (!r.ok || !r.text) return null;
  return safeParseJson(r.text);
}
