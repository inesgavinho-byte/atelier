import "server-only";
import { gateway } from "@/lib/ai/gateway";
import type { AIMessage, ProviderId } from "@/lib/ai/types";

/**
 * ATELIER — Council completo (LLM debate).
 *
 * For complex, multi-angle questions: ask several models the same thing in
 * parallel, each giving its own perspective, then synthesise a final answer.
 * The user never picks providers — the Council runs the panel. Best-effort:
 * needs at least two available panellists, otherwise the caller falls back to a
 * normal single reply.
 */

export interface Perspective {
  provider: ProviderId;
  label: string;
  model: string;
  text: string;
}

export interface DebateResult {
  ok: boolean;
  error?: string;
  perspectives: Perspective[];
  synthesis: string;
  synthModel?: string;
}

const PANEL: { id: ProviderId; label: string; model: string }[] = [
  { id: "claude", label: "Claude", model: "claude-sonnet-4-6" },
  { id: "openai", label: "GPT-4o", model: "gpt-4o" },
  { id: "deepseek", label: "DeepSeek", model: "deepseek-chat" },
];

/** Append an instruction to the leading system message (keeps structure clean). */
function withInstruction(messages: AIMessage[], instruction: string): AIMessage[] {
  const [first, ...rest] = messages;
  if (first?.role === "system") {
    return [
      { role: "system", content: `${first.content}\n\n${instruction}` },
      ...rest,
    ];
  }
  return [{ role: "system", content: instruction }, ...messages];
}

const PERSPECTIVE_INSTRUCTION =
  "Dá a TUA perspectiva sobre a última questão, em 1-2 parágrafos. Sê " +
  "específico, assume uma posição e não te limites a repetir a pergunta. " +
  "Português europeu.";

const SYNTHESIS_INSTRUCTION =
  "Recebeste as perspectivas de vários modelos sobre a questão. Sintetiza-as " +
  "numa resposta final para a Inês: pontos de acordo, divergências relevantes " +
  "e a tua recomendação clara. Não menciones os nomes dos modelos. Português " +
  "europeu.";

export async function runDebate(messages: AIMessage[]): Promise<DebateResult> {
  const available = PANEL.filter((p) => gateway.get(p.id)?.available());
  if (available.length < 2) {
    return {
      ok: false,
      error:
        "O Council completo precisa de pelo menos 2 providers com chave (Claude, GPT-4o, DeepSeek).",
      perspectives: [],
      synthesis: "",
    };
  }

  // 1. Each panellist answers in parallel with its own perspective.
  const settled = await Promise.all(
    available.map(async (p) => {
      const r = await gateway.run({
        provider: p.id,
        model: p.model,
        temperature: 0.7,
        maxTokens: 700,
        messages: withInstruction(messages, PERSPECTIVE_INSTRUCTION),
      });
      return r.ok && r.text?.trim()
        ? { provider: p.id, label: p.label, model: r.model || p.model, text: r.text.trim() }
        : null;
    })
  );
  const perspectives = settled.filter((p): p is Perspective => Boolean(p));
  if (perspectives.length < 2) {
    return {
      ok: false,
      error: "Não foi possível obter perspectivas suficientes.",
      perspectives,
      synthesis: "",
    };
  }

  // 2. Synthesis — Claude Sonnet when available, else the first panellist.
  const synth = available.find((p) => p.id === "claude") ?? available[0];
  const panelText = perspectives
    .map((p) => `### ${p.label}\n${p.text}`)
    .join("\n\n");
  const s = await gateway.run({
    provider: synth.id,
    model: synth.model,
    temperature: 0.4,
    maxTokens: 1024,
    messages: [
      ...withInstruction(messages, SYNTHESIS_INSTRUCTION),
      { role: "user", content: `Perspectivas dos modelos:\n\n${panelText}` },
    ],
  });

  if (!s.ok || !s.text?.trim()) {
    // Degrade: no synthesis, but still return the perspectives.
    return {
      ok: true,
      perspectives,
      synthesis: "(não foi possível sintetizar — vê as perspectivas acima)",
      synthModel: synth.model,
    };
  }

  return {
    ok: true,
    perspectives,
    synthesis: s.text.trim(),
    synthModel: s.model || synth.model,
  };
}
