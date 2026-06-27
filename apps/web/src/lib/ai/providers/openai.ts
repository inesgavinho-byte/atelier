import "server-only";
import type { AIProvider, AIRunRequest, AIRunResponse } from "@/lib/ai/types";
import { providerMeta } from "@/lib/ai/types";
import { errMessage, fetchWithTimeout, readEnv } from "@/lib/ai/providers/http";

const META = providerMeta("openai")!;

/** OpenAI / ChatGPT provider. Implements the shared AIProvider contract. */
export const openaiProvider: AIProvider = {
  id: "openai",
  name: "OpenAI",
  defaultModel: META.defaultModel,
  supportsSearch: false,
  supportsVision: true,
  supportsFiles: true,
  supportsTools: true,
  supportsReasoning: true,

  available() {
    return Boolean(readEnv("OPENAI_API_KEY"));
  },

  async models() {
    const key = readEnv("OPENAI_API_KEY");
    if (!key) return META.models;
    try {
      const res = await fetchWithTimeout(
        "https://api.openai.com/v1/models",
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
      provider: "openai",
      model,
      latencyMs: 0,
    };
    const key = readEnv("OPENAI_API_KEY");
    if (!key)
      return { ...base, ok: false, error: "OPENAI_API_KEY em falta." };
    try {
      const res = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
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
    const r = await this.run(req);
    if (r.ok && r.text) yield r.text;
  },
};
