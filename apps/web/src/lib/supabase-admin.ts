import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client (server-only).
 *
 * Used exclusively for the connector_credentials secret store, which has RLS
 * enabled and no anon policy — only the service role can reach it. Never import
 * this from client code. Returns null when the service role key is not set, so
 * callers degrade gracefully instead of crashing.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    cached = null;
    return null;
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function hasAdminAccess(): boolean {
  return getSupabaseAdmin() !== null;
}

export interface ServiceRoleStatus {
  /** SUPABASE_SERVICE_ROLE_KEY is present. */
  configured: boolean;
  /** The key looks like a real service-role / secret key (bypasses RLS). */
  isServiceRole: boolean;
  /** Human note when the key is missing or looks wrong. */
  note?: string;
}

/**
 * Inspect the configured key WITHOUT exposing it. RLS-locked tables return zero
 * rows and NO error when read with a non-privileged key, so a wrong key looks
 * exactly like an empty table. This catches the common misconfiguration of
 * pasting a publishable/anon key into SUPABASE_SERVICE_ROLE_KEY.
 */
export function serviceRoleStatus(): ServiceRoleStatus {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    return {
      configured: false,
      isServiceRole: false,
      note: "SUPABASE_SERVICE_ROLE_KEY não está definida.",
    };
  }
  // New-format keys.
  if (key.startsWith("sb_secret_")) return { configured: true, isServiceRole: true };
  if (key.startsWith("sb_publishable_")) {
    return {
      configured: true,
      isServiceRole: false,
      note: "A chave parece ser uma publishable key, não a service role (sb_secret_…).",
    };
  }
  // Legacy JWT keys: decode the role claim.
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf8")
      ) as { role?: string };
      if (payload.role === "service_role") {
        return { configured: true, isServiceRole: true };
      }
      return {
        configured: true,
        isServiceRole: false,
        note: `A chave tem role "${payload.role ?? "desconhecido"}", não "service_role".`,
      };
    } catch {
      // fall through to the lenient default
    }
  }
  // Unknown format — assume valid but don't claim certainty.
  return { configured: true, isServiceRole: true };
}
