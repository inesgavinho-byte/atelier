import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStoredCredential } from "@/lib/credentials-store";

/**
 * ATELIER — per-workspace Supabase client (server-only).
 *
 * Each workspace can point at its own Supabase project. The credentials live in
 * connector_credentials (encrypted, RLS-locked) under connector_id
 * `supabase-workspace`, keyed per workspace:
 *   SUPABASE_URL_{workspaceId}
 *   SUPABASE_ANON_KEY_{workspaceId}
 *   SUPABASE_SERVICE_ROLE_KEY_{workspaceId}
 *   SUPABASE_PROJECT_ID_{workspaceId}
 *
 * When a workspace has no credentials configured, both builders fall back to
 * the global ATELIER client — so nothing breaks for workspaces that never set
 * one up. Secrets are resolved and used only here; they never reach the browser.
 */

export const WORKSPACE_SUPABASE_CONNECTOR = "supabase-workspace";

/** Database info surfaced in the workspace context panel. */
export interface WorkspaceDbInfo {
  configured: boolean;
  /** True when the secret store is reachable (service role present). */
  manageable: boolean;
  url?: string;
  projectId?: string;
  dashboardUrl?: string;
  connection: "ok" | "error" | "unknown";
  tableCount?: number;
  totalRows?: number;
  message?: string;
}

export function urlKey(workspaceId: string): string {
  return `SUPABASE_URL_${workspaceId}`;
}
export function anonKey(workspaceId: string): string {
  return `SUPABASE_ANON_KEY_${workspaceId}`;
}
export function serviceRoleKey(workspaceId: string): string {
  return `SUPABASE_SERVICE_ROLE_KEY_${workspaceId}`;
}
export function projectIdKey(workspaceId: string): string {
  return `SUPABASE_PROJECT_ID_${workspaceId}`;
}

function cred(envKey: string): Promise<string | null> {
  return getStoredCredential(WORKSPACE_SUPABASE_CONNECTOR, envKey);
}

/** Whether a workspace has its own Supabase URL + anon key configured. */
export async function hasWorkspaceSupabase(workspaceId: string): Promise<boolean> {
  const [url, key] = await Promise.all([
    cred(urlKey(workspaceId)),
    cred(anonKey(workspaceId)),
  ]);
  return Boolean(url && key);
}

/** The configured project ref for a workspace (or null). */
export async function getWorkspaceProjectId(
  workspaceId: string
): Promise<string | null> {
  return cred(projectIdKey(workspaceId));
}

/**
 * The workspace's own Supabase client (anon key), or the global ATELIER client
 * when none is configured. Never throws.
 */
export async function getWorkspaceSupabase(
  workspaceId: string
): Promise<SupabaseClient | null> {
  const [url, key] = await Promise.all([
    cred(urlKey(workspaceId)),
    cred(anonKey(workspaceId)),
  ]);
  if (url && key) {
    return createClient(url, key, { auth: { persistSession: false } });
  }
  return getSupabase();
}

/**
 * The workspace's own service-role client (for privileged reads), or the global
 * admin client when none is configured. Returns null when neither exists.
 */
export async function getWorkspaceSupabaseAdmin(
  workspaceId: string
): Promise<SupabaseClient | null> {
  const [url, service] = await Promise.all([
    cred(urlKey(workspaceId)),
    cred(serviceRoleKey(workspaceId)),
  ]);
  if (url && service) {
    return createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return getSupabaseAdmin();
}
