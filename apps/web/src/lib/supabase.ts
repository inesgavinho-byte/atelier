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
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase não configurado: definir SUPABASE_URL e SUPABASE_ANON_KEY."
    );
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
