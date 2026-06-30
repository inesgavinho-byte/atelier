import { describe, it, expect, vi } from "vitest";
import { AIGateway } from "@/lib/ai/gateway";
import type { AIProvider, ProviderId } from "@/lib/ai/types";

/** A minimal mock provider with a controllable availability + run. */
function mockProvider(
  id: ProviderId,
  available: boolean,
  run?: AIProvider["run"]
): AIProvider {
  return {
    id,
    name: id,
    defaultModel: "mock-model",
    supportsSearch: false,
    supportsVision: false,
    supportsFiles: false,
    supportsTools: false,
    supportsReasoning: false,
    available: () => available,
    models: async () => [],
    run:
      run ??
      (async () => ({ ok: true, provider: id, model: "mock-model", latencyMs: 1, text: `ran ${id}` })),
    // eslint-disable-next-line require-yield
    async *stream() {
      return;
    },
  };
}

describe("AIGateway.run", () => {
  it("dispatches to the requested available provider", async () => {
    const claudeRun = vi.fn(async () => ({
      ok: true as const,
      provider: "claude" as ProviderId,
      model: "mock-model",
      latencyMs: 1,
      text: "ran claude",
    }));
    const gw = new AIGateway([
      mockProvider("claude", true, claudeRun),
      mockProvider("openai", true),
    ]);
    const res = await gw.run({ provider: "claude", messages: [] });
    expect(res.ok).toBe(true);
    expect(res.text).toBe("ran claude");
    expect(claudeRun).toHaveBeenCalledOnce();
  });

  it("returns a clear error (no throw) when the provider is unavailable", async () => {
    const gw = new AIGateway([mockProvider("claude", false)]);
    const res = await gw.run({ provider: "claude", messages: [] });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/credenciais/i);
  });

  it("returns a clear error (no throw) for an unknown provider", async () => {
    const gw = new AIGateway([mockProvider("claude", true)]);
    const res = await gw.run({ provider: "groq", messages: [] });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/desconhecido/i);
  });

  it("availability() reflects each provider's credentials", () => {
    const gw = new AIGateway([
      mockProvider("claude", false),
      mockProvider("openai", true),
    ]);
    const avail = new Map(gw.availability().map((a) => [a.id, a.available]));
    expect(avail.get("claude")).toBe(false);
    expect(avail.get("openai")).toBe(true);
  });
});

describe("AIGateway — fallback over an ordered provider list", () => {
  // The consumer pattern (mirrors runtime fallback): try providers in order,
  // run the first available one.
  async function runWithFallback(gw: AIGateway, order: ProviderId[]) {
    const firstAvailable = order.find((id) => gw.get(id)?.available());
    if (!firstAvailable) return { ok: false, error: "Nenhum provider disponível." };
    return gw.run({ provider: firstAvailable, messages: [] });
  }

  it("skips an unavailable provider and runs the next", async () => {
    const gw = new AIGateway([
      mockProvider("claude", false),
      mockProvider("openai", true),
    ]);
    const res = await runWithFallback(gw, ["claude", "openai"]);
    expect(res.ok).toBe(true);
    expect((res as { text?: string }).text).toBe("ran openai");
  });

  it("fails clearly when every provider is unavailable", async () => {
    const gw = new AIGateway([
      mockProvider("claude", false),
      mockProvider("openai", false),
    ]);
    const res = await runWithFallback(gw, ["claude", "openai"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/nenhum provider/i);
  });
});
