"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { hasAdminAccess } from "@/lib/supabase-admin";
import { saveCredential } from "@/lib/credentials-store";
import { fetchWithTimeout } from "@/lib/ai/providers/http";
import {
  WORKSPACE_SUPABASE_CONNECTOR as CONN,
  urlKey,
  anonKey,
  serviceRoleKey,
  projectIdKey,
  type WorkspaceDbInfo,
} from "@/lib/supabase-workspace";
import { getWorkspaceTables } from "@/lib/supabase-workspace-info";

const now = () => new Date().toISOString();

function isHttpsUrl(u: string): boolean {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}

/** Derive the project ref from a Supabase URL (https://<ref>.supabase.co). */
function refFromUrl(url: string): string | undefined {
  return url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
}

/**
 * Save a workspace's own Supabase credentials. Secrets (anon key, service role)
 * go to connector_credentials (encrypted); the non-secret URL + project ref are
 * also mirrored onto the workspace row for cheap reads. Requires the service
 * role (the secret store is RLS-locked) — degrades with a clear message.
 */
export async function setWorkspaceSupabase(
  workspaceId: string,
  input: {
    url: string;
    anonKey: string;
    projectId?: string;
    serviceRoleKey?: string;
  }
): Promise<{ ok: boolean; message: string }> {
  const url = input.url.trim();
  const anon = input.anonKey.trim();
  if (!url || !anon) {
    return { ok: false, message: "URL e Anon Key são obrigatórios." };
  }
  if (!isHttpsUrl(url)) {
    return { ok: false, message: "URL inválido — usa https://…" };
  }
  const projectId = (input.projectId?.trim() || refFromUrl(url)) ?? "";

  const saves = [
    saveCredential(CONN, urlKey(workspaceId), url),
    saveCredential(CONN, anonKey(workspaceId), anon),
  ];
  if (projectId) saves.push(saveCredential(CONN, projectIdKey(workspaceId), projectId));
  if (input.serviceRoleKey?.trim()) {
    saves.push(
      saveCredential(CONN, serviceRoleKey(workspaceId), input.serviceRoleKey.trim())
    );
  }
  const results = await Promise.all(saves);
  const failed = results.find((r) => !r.ok);
  if (failed) return { ok: false, message: failed.message };

  // Mirror the non-secret identifiers onto the workspace row (anon-readable),
  // so the panel can show the state + dashboard link without the service role.
  const sb = getSupabase();
  if (sb) {
    await sb
      .from("workspaces")
      .update({
        supabase_url: url,
        supabase_project_id: projectId || null,
        updated_at: now(),
      })
      .eq("id", workspaceId);
  }

  revalidatePath(`/workspaces/${workspaceId}`);
  return { ok: true, message: "Supabase ligado a este workspace." };
}

/**
 * Database info for the context panel. Reads the non-secret URL + project ref
 * from the workspace row (no service role needed), then uses the Management API
 * (SUPABASE_ACCESS_TOKEN) for table/row counts. Never throws.
 */
export async function getWorkspaceDatabaseInfo(
  workspaceId: string
): Promise<WorkspaceDbInfo> {
  const manageable = hasAdminAccess();
  const sb = getSupabase();
  const { data } = sb
    ? await sb
        .from("workspaces")
        .select("supabase_url, supabase_project_id")
        .eq("id", workspaceId)
        .maybeSingle()
    : { data: null };

  const url = (data?.supabase_url as string | null) ?? undefined;
  const projectId = (data?.supabase_project_id as string | null) ?? undefined;

  if (!url) {
    return { configured: false, manageable, connection: "unknown" };
  }

  const dashboardUrl = projectId
    ? `https://supabase.com/dashboard/project/${projectId}`
    : undefined;

  let connection: WorkspaceDbInfo["connection"] = "unknown";
  let tableCount: number | undefined;
  let totalRows: number | undefined;

  if (projectId) {
    const tables = await getWorkspaceTables(workspaceId, projectId);
    if (tables.ok) {
      connection = "ok";
      tableCount = tables.tableCount;
      totalRows = tables.totalRows;
    }
  }

  // When the Management API isn't available, fall back to a REST reachability
  // ping so the badge still reflects whether the project responds.
  if (connection === "unknown") {
    try {
      const res = await fetchWithTimeout(`${url}/rest/v1/`, {}, 8000);
      connection = res.status > 0 ? "ok" : "error";
    } catch {
      connection = "error";
    }
  }

  return {
    configured: true,
    manageable,
    url,
    projectId,
    dashboardUrl,
    connection,
    tableCount,
    totalRows,
  };
}
