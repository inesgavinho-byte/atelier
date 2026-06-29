import "server-only";
import type {
  AIProvider,
  AIRunRequest,
  AIRunResponse,
  ProviderId,
} from "@/lib/ai/types";
import { openaiProvider } from "@/lib/ai/providers/openai";
import { claudeProvider } from "@/lib/ai/providers/claude";
import { perplexityProvider } from "@/lib/ai/providers/perplexity";
import { groqProvider } from "@/lib/ai/providers/groq";
import { deepseekProvider } from "@/lib/ai/providers/deepseek";

/**
 * ATELIER — AI Gateway.
 *
 * The single seam between ATELIER and any LLM. The rest of the app calls
 * `gateway.run()` and never a provider directly, so the chat storage and UI are
 * fully independent of which vendor executes a request. Adding a provider means
 * implementing AIProvider and registering it here — nothing else changes.
 */
export class AIGateway {
  private readonly providers: Map<ProviderId, AIProvider>;

  constructor(list: AIProvider[]) {
    this.providers = new Map(list.map((p) => [p.id, p]));
  }

  /** All registered providers. */
  list(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  get(id: ProviderId): AIProvider | undefined {
    return this.providers.get(id);
  }

  /** Availability of every provider (credentials present). */
  availability(): { id: ProviderId; name: string; available: boolean }[] {
    return this.list().map((p) => ({
      id: p.id,
      name: p.name,
      available: p.available(),
    }));
  }

  /** Models for a provider (network where supported). */
  async models(id: ProviderId): Promise<string[]> {
    const p = this.get(id);
    return p ? p.models() : [];
  }

  /**
   * Execute a request against the chosen provider and return a normalized
   * response. The only entry point the rest of ATELIER uses.
   */
  async run(
    req: AIRunRequest & { provider: ProviderId }
  ): Promise<AIRunResponse> {
    const { provider, ...rest } = req;
    const p = this.get(provider);
    if (!p) {
      return {
        ok: false,
        provider,
        model: rest.model ?? "",
        latencyMs: 0,
        error: `Provider desconhecido: ${provider}.`,
      };
    }
    if (!p.available()) {
      return {
        ok: false,
        provider,
        model: rest.model ?? p.defaultModel,
        latencyMs: 0,
        error: "Credenciais em falta.",
      };
    }
    return p.run(rest);
  }

  /**
   * Stream a request against the chosen provider, yielding text deltas. Yields
   * nothing when the provider is unknown or its credentials are missing — the
   * caller should fall back to run() if the stream produced no text.
   */
  async *stream(
    req: AIRunRequest & { provider: ProviderId }
  ): AsyncGenerator<string> {
    const { provider, ...rest } = req;
    const p = this.get(provider);
    if (!p || !p.available()) return;
    yield* p.stream(rest);
  }
}

/** The shared gateway instance. Register future providers here. */
export const gateway = new AIGateway([
  openaiProvider,
  claudeProvider,
  perplexityProvider,
  groqProvider,
  deepseekProvider,
]);
