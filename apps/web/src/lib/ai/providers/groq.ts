import "server-only";
import type { AIProvider, AIRunRequest, AIRunResponse } from "@/lib/ai/types";
import { providerMeta } from "@/lib/ai/types";
import { errMessage, fetchWithTimeout, readEnv } from "@/lib/ai/providers/http";

/**
 * Groq provider — ultra-fast inference of open models (Llama, Mixtral). Groq
 * exposes an OpenAI-compatible API, so the request/response shape mirrors the
 * OpenAI provider; only the base URL and key differ.
 */
const META = providerMeta("groq")!;
const BASE = "https://api.groq.com/openai/v1";

export const groqProvider: AIProvider = {
  id: "groq",
  name: "Groq",
  defaultModel: META.defaultModel,
  supportsSearch: false,
  supportsVision: false,
  supportsFiles: false,
  supportsTools: true,
  supportsReasoning: false,

  available() {
    return Boolean(readEnv("GROQ_API_KEY"));
  },

  async models() {
    const key = readEnv("GROQ_API_KEY");
    if (!key) return META.models;
    try {
      const res = await fetchWithTimeout(
        `${BASE}/models`,
        { headers: { Authorization: `Bearer ${key}` } },
        9000
      );
      if (!res.ok) return META.models;
      const data = (await res.json()) as { data?: { id: string }[] };
      const ids = (data.data ?? []).map((m) => m.id).filter(Boolean);
      return ids.length ? ids.sort() : META.models;
    } catch {
      return META.models;
    }
  },

  async run(req: AIRunRequest): Promise<AIRunResponse> {
    const model = req.model || META.defaultModel;
    const t0 = Date.now();
    const base: Omit<AIRunResponse, "ok"> = {
      provider: "groq",
      model,
      latencyMs: 0,
    };
    const key = readEnv("GROQ_API_KEY");
    if (!key) return { ...base, ok: false, error: "GROQ_API_KEY em falta." };
    try {
      const res = await fetchWithTimeout(`${BASE}/chat/completions`, {
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
    const r = await this.run(req);
    if (r.ok && r.text) yield r.text;
  },
};
