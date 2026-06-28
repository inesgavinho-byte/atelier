import type { TaskType } from "@/lib/ai-runtime/classifier";
import type { ProviderId } from "@/lib/ai/types";

/**
 * ATELIER — Routing table.
 *
 * Maps each task type to the ideal provider/model for that kind of work, with a
 * short human-readable reason. The runtime resolves this against the registered,
 * available gateway providers and falls back when the ideal one isn't ready. The
 * routing is invisible to the user — only the resolved model + task type surface.
 */

export type RouteProvider =
  | "anthropic"
  | "openai"
  | "perplexity"
  | "groq"
  | "deepseek";

export interface ModelRoute {
  provider: RouteProvider;
  model: string;
  reason: string;
}

export const ROUTING_TABLE: Record<TaskType, ModelRoute> = {
  search: {
    provider: "perplexity",
    model: "sonar-pro",
    reason: "Tem acesso à web em tempo real",
  },
  code: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    reason: "Melhor relação qualidade/custo para código",
  },
  writing: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    reason: "Melhor qualidade de linguagem",
  },
  planning: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    reason: "Raciocínio estruturado e multi-passo",
  },
  summary: {
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    reason: "Rápido e barato para resumos",
  },
  reasoning: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    reason: "Análise profunda e raciocínio",
  },
  general: {
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    reason: "Conversação geral — modelo mais económico",
  },
};

/**
 * Map a routing-table provider to a registered gateway ProviderId. Providers
 * not yet wired into the gateway (groq, deepseek) map to null so the runtime
 * falls back to an available provider.
 */
export function routeToGatewayProvider(p: RouteProvider): ProviderId | null {
  switch (p) {
    case "anthropic":
      return "claude";
    case "openai":
      return "openai";
    case "perplexity":
      return "perplexity";
    case "groq":
    case "deepseek":
      return null;
  }
}
