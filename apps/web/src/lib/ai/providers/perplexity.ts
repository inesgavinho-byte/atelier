import "server-only";
import type { AIProvider, AIRunRequest, AIRunResponse } from "@/lib/ai/types";
import { providerMeta } from "@/lib/ai/types";
import {
  errMessage,
  fetchWithTimeout,
  readEnv,
  streamOpenAICompat,
} from "@/lib/ai/providers/http";

const META = providerMeta("perplexity")!;

/** Perplexity provider (OpenAI-compatible chat completions). */
export const perplexityProvider: AIProvider = {
  id: "perplexity",
  name: "Perplexity",
  defaultModel: META.defaultModel,
  supportsSearch: true,
  supportsVision: false,
  supportsFiles: false,
  supportsTools: false,
  supportsReasoning: true,

  available() {
    return Boolean(readEnv("PERPLEXITY_API_KEY"));
  },

  async models() {
    // Perplexity has no public models endpoint — return the curated list.
    return META.models;
  },

  async run(req: AIRunRequest): Promise<AIRunResponse> {
    const model = req.model || META.defaultModel;
    const t0 = Date.now();
    const base: Omit<AIRunResponse, "ok"> = {
      provider: "perplexity",
      model,
      latencyMs: 0,
    };
    const key = readEnv("PERPLEXITY_API_KEY");
    if (!key)
      return { ...base, ok: false, error: "PERPLEXITY_API_KEY em falta." };
    try {
      const res = await fetchWithTimeout(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: req.messages,
            temperature: req.temperature ?? 0.7,
            max_tokens: req.maxTokens ?? 1024,
          }),
        }
      );
      const latencyMs = Date.now() - t0;
      if (!res.ok)
        return {
          ...base,
          ok: false,
          latencyMs,
          error: `HTTP ${res.status} ${res.statusText}.`,
        };
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { total_tokens?: number };
        model?: string;
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text)
        return { ...base, ok: false, latencyMs, error: "Resposta vazia." };
      return {
        ...base,
        ok: true,
        model: data.model || model,
        text,
        tokens: data.usage?.total_tokens ?? null,
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
    const key = readEnv("PERPLEXITY_API_KEY");
    if (!key) return;
    yield* streamOpenAICompat(
      "https://api.perplexity.ai/chat/completions",
      key,
      {
        model: req.model || META.defaultModel,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 1024,
      }
    );
  },
};
