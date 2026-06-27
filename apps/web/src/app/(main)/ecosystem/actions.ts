"use server";

import { getSupabase } from "@/lib/supabase";
import { testConnectorLive, type TestOutcome } from "@/lib/connector-status";
import { gateway } from "@/lib/ai/gateway";
import { getInitiatives } from "@/lib/mission";

/** Run a connector's live "test connection". */
export async function testConnector(id: string): Promise<TestOutcome> {
  return testConnectorLive(id);
}

/** Run a single OpenAI prompt through the gateway (connector test form). */
export async function runOpenAIPrompt(
  prompt: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!prompt.trim()) return { ok: false, error: "Prompt vazio." };
  const r = await gateway.run({
    provider: "openai",
    messages: [{ role: "user", content: prompt }],
  });
  return r.ok
    ? { ok: true, text: r.text }
    : { ok: false, error: r.error ?? "Falha desconhecida." };
}

/**
 * Save an OpenAI test response to the existing captures table. When an
 * initiative is provided the association is recorded inside the capture text
 * (no schema change). Returns whether the write succeeded.
 */
export async function saveOpenAICapture(input: {
  prompt: string;
  response: string;
  initiativeId?: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, message: "Supabase não configurado — nada guardado." };
  }

  let initiativeName: string | undefined;
  if (input.initiativeId) {
    const initiatives = await getInitiatives();
    initiativeName = initiatives.find((i) => i.id === input.initiativeId)?.name;
  }

  const header = [
    "Fonte: OpenAI / ChatGPT",
    initiativeName ? `Iniciativa: ${initiativeName}` : null,
    `Prompt: ${input.prompt}`,
  ]
    .filter(Boolean)
    .join("\n");
  const value = `${header}\n\n${input.response}`;

  const { error } = await sb.from("captures").insert({ kind: "texto", value });
  if (error) {
    return { ok: false, message: `Falha ao guardar: ${error.message}` };
  }
  return {
    ok: true,
    message: initiativeName
      ? `Guardado como captura · associado a ${initiativeName}.`
      : "Guardado como captura.",
  };
}
