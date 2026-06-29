import "server-only";
import type { AIProvider, AIRunRequest, AIRunResponse } from "@/lib/ai/types";
import { providerMeta } from "@/lib/ai/types";
import {
  errMessage,
  fetchWithTimeout,
  readEnv,
  streamAnthropic,
} from "@/lib/ai/providers/http";

const META = providerMeta("claude")!;
const KEYS = ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"];

/** Anthropic Claude provider. Implements the shared AIProvider contract. */
export const claudeProvider: AIProvider = {
  id: "claude",
  name: "Claude",
  defaultModel: META.defaultModel,
  supportsSearch: false,
  supportsVision: true,
  supportsFiles: true,
  supportsTools: true,
  supportsReasoning: true,

  available() {
    return Boolean(readEnv(...KEYS));
  },

  async models() {
    const key = readEnv(...KEYS);
    if (!key) return META.models;
    try {
      const res = await fetchWithTimeout(
        "https://api.anthropic.com/v1/models",
        {
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
        },
        9000
      );
      if (!res.ok) return META.models;
      const data = (await res.json()) as { data?: { id: string }[] };
      const ids = (data.data ?? []).map((m) => m.id).filter(Boolean);
      return ids.length ? ids : META.models;
    } catch {
      return META.models;
    }
  },

  async run(req: AIRunRequest): Promise<AIRunResponse> {
    const model = req.model || META.defaultModel;
    const t0 = Date.now();
    const base: Omit<AIRunResponse, "ok"> = {
      provider: "claude",
      model,
      latencyMs: 0,
    };
    const key = readEnv(...KEYS);
    if (!key)
      return { ...base, ok: false, error: "ANTHROPIC_API_KEY em falta." };

    // Anthropic keeps the system prompt separate from the message turns.
    const system = req.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const turns = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 1024,
          temperature: req.temperature ?? 0.7,
          ...(system ? { system } : {}),
          messages: turns,
        }),
      });
      const latencyMs = Date.now() - t0;
      if (!res.ok)
        return {
          ...base,
          ok: false,
          latencyMs,
          error: `HTTP ${res.status} ${res.statusText}.`,
        };
      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
        model?: string;
      };
      const text = (data.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim();
      if (!text)
        return { ...base, ok: false, latencyMs, error: "Resposta vazia." };
      const tokens =
        (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) ||
        null;
      return {
        ...base,
        ok: true,
        model: data.model || model,
        text,
        tokens,
        latencyMs,
      };
    } catch (e) {
      return {
        ...base,
        ok: false,
        latencyMs: Date.now() - t0,
        error: errMessage(e),
      };
    }
  },

  async *stream(req: AIRunRequest) {
    const key = readEnv(...KEYS);
    if (!key) return;
    const system = req.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const turns = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    yield* streamAnthropic(key, {
      model: req.model || META.defaultModel,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages: turns,
    });
  },
};
