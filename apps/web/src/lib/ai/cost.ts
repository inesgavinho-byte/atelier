/**
 * ATELIER — rough cost estimation (client-safe; no secrets).
 *
 * Prices in USD per 1M tokens (blended input+output midpoint, since the stored
 * token count is a single total). Deliberately approximate — it's for "ordem de
 * grandeza" visibility, not billing.
 */

interface Price {
  /** Matches the start of a model id. */
  prefix: string;
  /** USD per 1M tokens, blended. */
  perMillion: number;
}

// Blended ≈ (input + output) / 2 from the published per-1M prices.
const PRICES: Price[] = [
  { prefix: "claude-opus", perMillion: 22.5 },
  { prefix: "claude-sonnet", perMillion: 9 }, // $3 in / $15 out
  { prefix: "claude-haiku", perMillion: 2.5 },
  { prefix: "gpt-4o-mini", perMillion: 0.45 },
  { prefix: "gpt-4o", perMillion: 10 }, // $5 in / $15 out
  { prefix: "gpt-4.1", perMillion: 6 },
  { prefix: "deepseek", perMillion: 0.7 }, // $0.27 in / $1.10 out
  { prefix: "llama", perMillion: 0.59 }, // Groq
  { prefix: "sonar", perMillion: 4 }, // Perplexity Sonar Pro + search
];

/** Estimated USD cost for a model + total token count. Null when unknown. */
export function estimateCostUSD(
  model: string | undefined,
  tokens: number | null | undefined
): number | null {
  if (!model || !tokens || tokens <= 0) return null;
  const m = model.toLowerCase();
  const price = PRICES.find((p) => m.startsWith(p.prefix));
  if (!price) return null;
  return (tokens / 1_000_000) * price.perMillion;
}

/** Format an estimated cost like "~$0.0012" / "<$0.0001". */
export function formatCostUSD(usd: number | null): string | null {
  if (usd == null) return null;
  if (usd < 0.0001) return "<$0.0001";
  return `~$${usd.toFixed(usd < 0.01 ? 4 : 3)}`;
}
