import "server-only";
import { getSupabaseAdmin, hasAdminAccess } from "@/lib/supabase-admin";
import { decrypt, encrypt, encryptionAvailable } from "@/lib/crypto";
import {
  clearCredentialOverride,
  setCredentialOverride,
} from "@/lib/ai/providers/http";

/**
 * Connector credential secret store (server-only).
 *
 * Credentials are written to the RLS-locked connector_credentials table via the
 * service role, encrypted at rest when ATELIER_CRED_KEY is set. The plaintext
 * is never returned to the browser — it is only injected server-side as a
 * credential override so providers resolve it exactly like an env var.
 */

export interface CredentialSecurity {
  /** Service role present → the secret store is reachable. */
  manageable: boolean;
  /** ATELIER_CRED_KEY present → values are encrypted at rest. */
  encrypted: boolean;
}

export function credentialSecurity(): CredentialSecurity {
  return { manageable: hasAdminAccess(), encrypted: encryptionAvailable() };
}

function readValue(row: { encrypted: boolean; value: string }): string | null {
  if (row.encrypted) return decrypt(row.value);
  return row.value ?? null;
}

let hydrated = false;

/**
 * Load every stored credential and register it as a server-side override so
 * `readEnv` resolves it. Idempotent per instance; safe to call before any
 * status check, test or run.
 */
export async function hydrateCredentialOverrides(): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { data, error } = await admin
    .from("connector_credentials")
    .select("env_key, value, encrypted");
  if (error || !data) return;
  for (const row of data) {
    const value = readValue(row);
    if (value) setCredentialOverride(row.env_key, value);
  }
  hydrated = true;
}

export function credentialsHydrated(): boolean {
  return hydrated;
}

/** Save (upsert) a credential value. Encrypts when possible. */
export async function saveCredential(
  connectorId: string,
  envKey: string,
  value: string
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      message:
        "Gestão de credenciais indisponível: falta SUPABASE_SERVICE_ROLE_KEY no ambiente.",
    };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, message: "Valor vazio." };

  const enc = encrypt(trimmed);
  const stored = enc ?? trimmed;
  const isEncrypted = enc !== null;

  const { error } = await admin.from("connector_credentials").upsert(
    {
      connector_id: connectorId,
      env_key: envKey,
      value: stored,
      encrypted: isEncrypted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "connector_id,env_key" }
  );
  if (error) return { ok: false, message: error.message };

  // Make it usable immediately this instance.
  setCredentialOverride(envKey, trimmed);
  return {
    ok: true,
    message: isEncrypted
      ? "Credencial guardada (encriptada)."
      : "Credencial guardada (texto simples — define ATELIER_CRED_KEY para encriptar).",
  };
}

/** Remove all stored credentials for a connector. */
export async function deleteConnectorCredentials(
  connectorId: string,
  envKeys: string[]
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      message: "Gestão de credenciais indisponível (falta service role).",
    };
  }
  const { error } = await admin
    .from("connector_credentials")
    .delete()
    .eq("connector_id", connectorId);
  if (error) return { ok: false, message: error.message };
  for (const k of envKeys) clearCredentialOverride(k);
  return { ok: true, message: "Credenciais removidas." };
}
