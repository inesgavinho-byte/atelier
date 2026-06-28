/**
 * ATELIER — AI Gateway contract (client-safe).
 *
 * Every provider implements exactly this interface. ATELIER talks only to
 * `AIProvider` (through the gateway), never to a specific vendor SDK. This file
 * holds no secrets and performs no network calls, so it is safe to import from
 * client components (it carries the provider metadata used by the chat UI).
 */

export type ProviderId =
  | "openai"
  | "claude"
  | "perplexity"
  | "groq"
  | "deepseek";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIRunRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  reasoning?: string | null;
}

export interface AIRunResponse {
  ok: boolean;
  provider: ProviderId;
  model: string;
  text?: string;
  tokens?: number | null;
  latencyMs: number;
  error?: string;
}

/** The single contract every provider — present and future — must satisfy. */
export interface AIProvider {
  id: ProviderId;
  name: string;
  defaultModel: string;

  supportsSearch: boolean;
  supportsVision: boolean;
  supportsFiles: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;

  /** Whether the required credentials are present (no network). */
  available(): boolean;
  /** List selectable models (may hit the network). */
  models(): Promise<string[]>;
  /** Execute one request and return a normalized response. */
  run(req: AIRunRequest): Promise<AIRunResponse>;
  /** Stream the response. Default providers yield the final text once. */
  stream(req: AIRunRequest): AsyncGenerator<string, void, unknown>;
}

/* ── Client-safe provider metadata (for the chat UI) ──────────────────────── */

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  defaultModel: string;
  models: string[];
}

export const PROVIDER_META: ProviderMeta[] = [
  {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },
  {
    id: "claude",
    name: "Claude",
    defaultModel: "claude-sonnet-4-6",
    models: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-8"],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    defaultModel: "sonar",
    models: ["sonar", "sonar-pro", "sonar-reasoning"],
  },
  {
    id: "groq",
    name: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
];

/** Provider labels stored on a chat. ATELIER and Manus are non-executing. */
export const CHAT_PROVIDER_LABELS = [
  "ATELIER",
  "OpenAI",
  "Claude",
  "Perplexity",
  "Manus",
] as const;

export function providerMeta(id: ProviderId): ProviderMeta | undefined {
  return PROVIDER_META.find((m) => m.id === id);
}

/** Map a stored chat provider label to a gateway provider id (or null). */
export function providerIdFromLabel(label?: string | null): ProviderId | null {
  switch ((label ?? "").trim().toLowerCase()) {
    case "openai":
      return "openai";
    case "claude":
      return "claude";
    case "perplexity":
      return "perplexity";
    case "groq":
      return "groq";
    case "deepseek":
      return "deepseek";
    default:
      return null;
  }
}

/** Default model for a stored provider label, if it maps to a gateway id. */
export function defaultModelForLabel(label?: string | null): string | undefined {
  const id = providerIdFromLabel(label);
  return id ? providerMeta(id)?.defaultModel : undefined;
}
