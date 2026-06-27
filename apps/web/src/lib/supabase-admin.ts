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
