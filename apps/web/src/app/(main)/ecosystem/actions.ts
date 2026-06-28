"use server";

import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { testConnectorLive, type TestOutcome } from "@/lib/connector-status";
import { gateway } from "@/lib/ai/gateway";
import { getConnectorDef } from "@/lib/connectors";
import {
  deleteConnectorCredentials,
  hydrateCredentialOverrides,
  saveCredential,
} from "@/lib/credentials-store";
import { getInitiatives } from "@/lib/mission";

/** Run a connector's live "test connection". */
export async function testConnector(id: string): Promise<TestOutcome> {
  return testConnectorLive(id);
}

/**
 * Save one or more credential values for a connector to the secret store. The
 * values are written server-side (encrypted at rest when ATELIER_CRED_KEY is
 * set) and never returned to the browser.
 */
export async function saveConnectorCredential(
  connectorId: string,
  values: Record<string, string>
): Promise<{ ok: boolean; message: string }> {
  const def = getConnectorDef(connectorId);
  if (!def) return { ok: false, message: "Conector desconhecido." };

  const entries = Object.entries(values).filter(([, v]) => v && v.trim());
  if (!entries.length) return { ok: false, message: "Nada para guardar." };

  const messages: string[] = [];
  for (const [envKey, value] of entries) {
    const r = await saveCredential(connectorId, envKey, value);
    if (!r.ok) return { ok: false, message: r.message };
    messages.push(r.message);
  }
  return { ok: true, message: messages[messages.length - 1] };
}

/** A single credential activity row (no secret value is ever exposed). */
export interface ConnectorLog {
  env_key: string;
  created_at: string;
  updated_at: string;
}

/**
 * Read a connector's credential activity from the secret store via the service
 * role. Selects ONLY metadata columns — never the credential value. Returns []
 * when the service role is unavailable or on any error.
 */
export async function getConnectorLogs(
  connectorId: string
): Promise<ConnectorLog[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data, error } = await admin
    .from("connector_credentials")
    .select("env_key, created_at, updated_at")
    .eq("connector_id", connectorId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data as ConnectorLog[];
}

/** Remove a connector's stored credentials. */
export async function disconnectConnector(
  connectorId: string
): Promise<{ ok: boolean; message: string }> {
  const def = getConnectorDef(connectorId);
  if (!def) return { ok: false, message: "Conector desconhecido." };
  const keys = [...def.envRequired, ...(def.envOptional ?? [])];
  return deleteConnectorCredentials(connectorId, keys);
}

/** Run a single OpenAI prompt through the gateway (connector test form). */
export async function runOpenAIPrompt(
  prompt: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!prompt.trim()) return { ok: false, error: "Prompt vazio." };
  await hydrateCredentialOverrides();
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
  workspaceId?: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, message: "Supabase não configurado — nada guardado." };
  }

  let initiativeName: string | undefined;
  if (input.workspaceId) {
    const initiatives = await getInitiatives();
    initiativeName = initiatives.find((i) => i.id === input.workspaceId)?.name;
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
