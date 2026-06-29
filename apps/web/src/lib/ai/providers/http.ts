import "server-only";
import type { StreamMeta } from "@/lib/ai/types";

/**
 * Shared HTTP helpers for AI providers (server-only). One place for the fetch
 * timeout and error-normalisation boilerplate so providers don't duplicate it.
 */

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function errMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "AbortError") return "Tempo limite excedido.";
    return e.message;
  }
  return String(e);
}

/**
 * Server-side credential overrides, populated from the secret store at runtime.
 * Lets stored credentials resolve exactly like environment variables without
 * the value ever reaching the browser. Process env always wins.
 */
const overrides = new Map<string, string>();

export function setCredentialOverride(name: string, value: string): void {
  overrides.set(name, value);
}

export function clearCredentialOverride(name: string): void {
  overrides.delete(name);
}

/** Read the first credential present (env first, then stored override). */
export function readEnv(...names: string[]): string | undefined {
  for (const n of names) if (process.env[n]) return process.env[n];
  for (const n of names) {
    const v = overrides.get(n);
    if (v) return v;
  }
  return undefined;
}

/* ── Streaming (SSE) helpers ───────────────────────────────────────────────── */

/** Read an SSE byte stream line by line, yielding each `data:` payload. */
async function* sseData(res: Response): AsyncGenerator<string> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
}

/**
 * Stream an OpenAI-compatible chat completion, yielding content deltas as they
 * arrive (openai / perplexity / groq / deepseek all share this shape). When
 * present, usage and Perplexity citations are reported via onMeta after the
 * stream ends.
 */
export async function* streamOpenAICompat(
  url: string,
  key: string,
  body: Record<string, unknown>,
  onMeta?: (meta: StreamMeta) => void
): AsyncGenerator<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok || !res.body) return;
  let tokens: number | null = null;
  let citations: string[] | undefined;
  for await (const payload of sseData(res)) {
    if (payload === "[DONE]") break;
    try {
      const json = JSON.parse(payload) as {
        choices?: { delta?: { content?: string } }[];
        usage?: { total_tokens?: number };
        citations?: unknown[];
      };
      if (Array.isArray(json.citations)) {
        citations = json.citations.filter(
          (c): c is string => typeof c === "string"
        );
      }
      if (json.usage?.total_tokens) tokens = json.usage.total_tokens;
      const delta = json.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) yield delta;
    } catch {
      /* keepalive / partial line — ignore */
    }
  }
  if (onMeta && (tokens != null || citations)) onMeta({ tokens, citations });
}

/** Stream an Anthropic messages response, yielding text deltas as they arrive. */
export async function* streamAnthropic(
  key: string,
  body: Record<string, unknown>,
  onMeta?: (meta: StreamMeta) => void
): AsyncGenerator<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok || !res.body) return;
  let input = 0;
  let output = 0;
  for await (const payload of sseData(res)) {
    try {
      const json = JSON.parse(payload) as {
        type?: string;
        delta?: { type?: string; text?: string };
        message?: { usage?: { input_tokens?: number } };
        usage?: { output_tokens?: number };
      };
      if (json.type === "message_start" && json.message?.usage?.input_tokens) {
        input = json.message.usage.input_tokens;
      }
      if (json.usage?.output_tokens) output = json.usage.output_tokens;
      if (
        json.type === "content_block_delta" &&
        json.delta?.type === "text_delta" &&
        typeof json.delta.text === "string" &&
        json.delta.text
      ) {
        yield json.delta.text;
      }
    } catch {
      /* ignore */
    }
  }
  if (onMeta) onMeta({ tokens: input + output || null });
}
