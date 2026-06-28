import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for the "Atelier" project.
 *
 * Created lazily so the build never needs the connection (all data pages are
 * dynamic). Reads happen in server components; writes in server actions. The
 * key never reaches the browser.
 *
 * Configure via env (see .env.example):
 *   NEXT_PUBLIC_SUPABASE_URL  (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY  ← preferred when set
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (or SUPABASE_ANON_KEY)  ← fallback
 *
 * The key is selected server-side and never reaches the browser. We prefer the
 * service-role key so reads keep working once RLS is closed to anonymous access
 * (see SECURITY.md); if it is absent we fall back to the anon key and behaviour
 * is unchanged. This is intentionally backwards compatible.
 */
let client: SupabaseClient | null = null;
let warned = false;

/**
 * Returns the client, or null if the env is not configured. Callers degrade to
 * empty data rather than crashing the page — a misconfigured environment must
 * not produce a hard 500. (A warning is logged so the cause is visible in the
 * server/function logs.)
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (!warned) {
      warned = true;
      console.warn(
        "[atelier] Supabase não configurado: definir NEXT_PUBLIC_SUPABASE_URL e uma chave (SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY)."
      );
    }
    return null;
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
