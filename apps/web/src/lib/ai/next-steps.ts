import "server-only";
import { gateway } from "@/lib/ai/gateway";
import type { AIMessage, ProviderId } from "@/lib/ai/types";

/**
 * ATELIER — "Próximos passos" suggester.
 *
 * After the Council answers, a cheap second pass proposes 2–3 concrete,
 * high-ROI next steps. Returns [] when no provider is available or nothing
 * actionable stands out — the UI only shows the section when steps exist.
 */

export interface NextStep {
  action: string;
  why: string;
  effort: "S" | "M" | "L";
}

const HAIKU = "claude-haiku-4-5-20251001";

const PROMPT = `És um assistente de produtividade. Analisa esta conversa e sugere 2-3 próximos passos concretos e accionáveis, ordenados por maior ROI para a utilizadora.
Responde SÓ com JSON válido, sem texto à volta: { "steps": [{ "action": "...", "why": "...", "effort": "S" | "M" | "L" }] }
- action: imperativo, curto.
- why: porquê / impacto, uma frase.
- effort: S (pequeno), M (médio), L (grande).
- Português europeu. Se não houver passos óbvios, devolve { "steps": [] }.`;

function parseSteps(text: string): NextStep[] {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  if (!t.startsWith("{")) {
    const s = t.indexOf("{");
    const e = t.lastIndexOf("}");
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
  }
  const effortOf = (v: unknown): NextStep["effort"] =>
    v === "S" || v === "L" ? v : "M";
  try {
    const obj = JSON.parse(t) as { steps?: unknown };
    if (!Array.isArray(obj.steps)) return [];
    return obj.steps
      .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
      .map(
        (s): NextStep => ({
          action: typeof s.action === "string" ? s.action.trim() : "",
          why: typeof s.why === "string" ? s.why.trim() : "",
          effort: effortOf(s.effort),
        })
      )
      .filter((s) => s.action.length > 0)
      .slice(0, 3);
  } catch {
    return [];
  }
}

/** Suggest next steps from a conversation. Cheap (Haiku) and best-effort. */
export async function suggestNextSteps(
  conversation: AIMessage[]
): Promise<NextStep[]> {
  const avail = gateway.availability();
  const provider: ProviderId | undefined =
    (avail.find((a) => a.id === "claude" && a.available)?.id as ProviderId) ??
    avail.find((a) => a.available)?.id;
  if (!provider) return [];

  const transcript = conversation
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(-6000);
  if (!transcript.trim()) return [];

  const r = await gateway.run({
    provider,
    model: provider === "claude" ? HAIKU : undefined,
    maxTokens: 512,
    temperature: 0,
    messages: [
      { role: "system", content: PROMPT },
      { role: "user", content: transcript },
    ],
  });
  if (!r.ok || !r.text) return [];
  return parseSteps(r.text);
}
