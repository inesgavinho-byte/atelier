import "server-only";
import { gateway } from "@/lib/ai/gateway";
import type { AIRunRequest, AIRunResponse, ProviderId } from "@/lib/ai/types";

/**
 * ATELIER — Council routing table.
 *
 * Maps a task type to the provider/model best suited to it. The user never
 * picks a model (ADR-0004): the Council routes by task, server-side, and falls
 * back gracefully when the chosen provider has no API key configured.
 *
 * Note on naming: the spec refers to Anthropic as the writing/reasoning
 * provider — in ATELIER's gateway that provider id is `claude`.
 */

export type TaskType =
  | "search"
  | "code"
  | "writing"
  | "planning"
  | "summary"
  | "reasoning"
  | "general";

export interface ModelRoute {
  provider: ProviderId;
  model: string;
  reason: string;
}

export const ROUTING_TABLE: Record<TaskType, ModelRoute> = {
  search: {
    provider: "perplexity",
    model: "sonar-pro",
    reason: "Acesso à web em tempo real",
  },
  code: {
    provider: "deepseek",
    model: "deepseek-chat",
    reason: "Especializado em código, muito barato",
  },
  writing: {
    provider: "claude",
    model: "claude-sonnet-4-6",
    reason: "Melhor qualidade de linguagem",
  },
  planning: {
    provider: "claude",
    model: "claude-sonnet-4-6",
    reason: "Raciocínio estruturado",
  },
  summary: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    reason: "Rápido e barato para resumos",
  },
  reasoning: {
    provider: "claude",
    model: "claude-sonnet-4-6",
    reason: "Análise profunda",
  },
  general: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    reason: "Conversação geral — económico",
  },
};

/**
 * Global fallback chain, tried in order when the routed provider has no key.
 * Anthropic (claude) → OpenAI → Groq. Each entry carries a safe default model.
 */
const FALLBACK_CHAIN: ModelRoute[] = [
  { provider: "claude", model: "claude-sonnet-4-6", reason: "Fallback — Anthropic" },
  { provider: "openai", model: "gpt-4o-mini", reason: "Fallback — OpenAI" },
  { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Fallback — Groq" },
];

function isAvailable(provider: ProviderId): boolean {
  return gateway.availability().some((a) => a.id === provider && a.available);
}

export interface ResolvedRoute extends ModelRoute {
  /** The task's preferred provider, when we had to fall back away from it. */
  fallbackFrom?: ProviderId;
}

/**
 * Resolve a task to an *available* route. Returns the table's choice when its
 * provider has a key; otherwise walks the fallback chain. Logs the substitution
 * (server-side only) and returns null when nothing is configured — callers turn
 * that into a clean, key-free message.
 */
export function resolveRoute(task: TaskType): ResolvedRoute | null {
  const preferred = ROUTING_TABLE[task];
  if (isAvailable(preferred.provider)) return preferred;

  for (const fb of FALLBACK_CHAIN) {
    if (fb.provider === preferred.provider) continue;
    if (isAvailable(fb.provider)) {
      console.warn(
        `[council] ${task}: ${preferred.provider} sem chave — fallback para ${fb.provider}.`
      );
      return { ...fb, fallbackFrom: preferred.provider };
    }
  }

  console.warn(`[council] ${task}: nenhum provider de IA configurado.`);
  return null;
}

/**
 * Run a request routed by task type, with the fallback applied. Never leaks a
 * provider's API-key error to the caller — when nothing is configured it
 * returns a single clear message.
 */
export async function runRouted(
  task: TaskType,
  req: AIRunRequest
): Promise<AIRunResponse> {
  const route = resolveRoute(task);
  if (!route) {
    return {
      ok: false,
      provider: ROUTING_TABLE[task].provider,
      model: ROUTING_TABLE[task].model,
      latencyMs: 0,
      error: "Nenhum provider de IA configurado.",
    };
  }
  return gateway.run({ ...req, provider: route.provider, model: req.model ?? route.model });
}
