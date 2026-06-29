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
    reason: "Acesso à web em tempo real",
  },
  code: {
    provider: "deepseek",
    model: "deepseek-chat",
    reason: "Especializado em código, muito barato",
  },
  writing: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    reason: "Melhor qualidade de linguagem",
  },
  planning: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    reason: "Raciocínio estruturado",
  },
  summary: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    reason: "Rápido e barato para resumos",
  },
  reasoning: {
    provider: "anthropic",
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
 * Map a routing-table provider to a registered gateway ProviderId. Groq and
 * DeepSeek are now wired into the gateway, so every route resolves to a real
 * provider; the runtime still falls back when the chosen one has no API key.
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
      return "groq";
    case "deepseek":
      return "deepseek";
  }
}
