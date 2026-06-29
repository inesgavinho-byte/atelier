import "server-only";
import { fetchWithTimeout } from "@/lib/ai/providers/http";
import { getWorkspaceProjectId } from "@/lib/supabase-workspace";

/**
 * ATELIER — read information about a workspace's Supabase project (server-only).
 *
 * Uses the Supabase Management API (https://api.supabase.com), which can run SQL
 * against a project, to list tables, read a table schema and run read-only
 * queries. Requires a personal access token in SUPABASE_ACCESS_TOKEN plus the
 * workspace's project ref. When either is missing, callers get a clear,
 * key-free "indisponível" result rather than an error — the feature degrades.
 */

export interface WorkspaceTable {
  schema: string;
  name: string;
  /** Estimated row count (pg_class.reltuples); 0 when never analysed. */
  rows: number;
}

export interface WorkspaceTablesResult {
  ok: boolean;
  tables: WorkspaceTable[];
  tableCount: number;
  totalRows: number;
  /** Where the data came from, or why it is unavailable. */
  source: "management" | "none";
  message?: string;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

const MGMT_BASE = "https://api.supabase.com/v1";

function accessToken(): string | undefined {
  return process.env.SUPABASE_ACCESS_TOKEN || undefined;
}

/** Run SQL via the Management API. Returns rows, or null on any failure. */
async function mgmtQuery<T = Record<string, unknown>>(
  projectId: string,
  query: string
): Promise<T[] | null> {
  const token = accessToken();
  if (!token) return null;
  try {
    const res = await fetchWithTimeout(
      `${MGMT_BASE}/projects/${projectId}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ query }),
      },
      15000
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : null;
  } catch {
    return null;
  }
}

async function resolveProject(workspaceId: string): Promise<string | null> {
  return getWorkspaceProjectId(workspaceId);
}

/** List public tables with estimated row counts. */
export async function getWorkspaceTables(
  workspaceId: string,
  projectIdOverride?: string
): Promise<WorkspaceTablesResult> {
  const empty: WorkspaceTablesResult = {
    ok: false,
    tables: [],
    tableCount: 0,
    totalRows: 0,
    source: "none",
  };

  const projectId = projectIdOverride || (await resolveProject(workspaceId));
  if (!projectId) {
    return { ...empty, message: "Sem project ID configurado." };
  }
  if (!accessToken()) {
    return {
      ...empty,
      message: "Define SUPABASE_ACCESS_TOKEN para ler tabelas e contagens.",
    };
  }

  const rows = await mgmtQuery<{ schema: string; name: string; rows: number }>(
    projectId,
    `select n.nspname as schema, c.relname as name,
            greatest(c.reltuples, 0)::bigint as rows
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'r' and n.nspname = 'public'
     order by c.relname;`
  );
  if (!rows) {
    return { ...empty, message: "Não foi possível ler o projecto." };
  }

  const tables = rows.map((r) => ({
    schema: r.schema,
    name: r.name,
    rows: Number(r.rows) || 0,
  }));
  return {
    ok: true,
    tables,
    tableCount: tables.length,
    totalRows: tables.reduce((n, t) => n + t.rows, 0),
    source: "management",
  };
}

/** Columns of a single table. */
export async function getWorkspaceTableSchema(
  workspaceId: string,
  tableName: string
): Promise<TableColumn[]> {
  const projectId = await resolveProject(workspaceId);
  if (!projectId) return [];
  // Parameterless API → quote the identifier safely (letters/digits/_ only).
  const safe = tableName.replace(/[^A-Za-z0-9_]/g, "");
  if (!safe) return [];
  const rows = await mgmtQuery<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>(
    projectId,
    `select column_name, data_type, is_nullable
     from information_schema.columns
     where table_schema = 'public' and table_name = '${safe}'
     order by ordinal_position;`
  );
  if (!rows) return [];
  return rows.map((r) => ({
    name: r.column_name,
    type: r.data_type,
    nullable: r.is_nullable === "YES",
  }));
}

/**
 * Run a read-only query against the workspace's project (Management API). The
 * caller is responsible for enforcing SELECT-only; this also refuses anything
 * that is not a single SELECT as defence in depth.
 */
export async function executeWorkspaceQuery(
  workspaceId: string,
  query: string
): Promise<{ ok: boolean; rows?: unknown[]; error?: string }> {
  const trimmed = query.trim().replace(/;+\s*$/, "");
  if (!/^select\s/i.test(trimmed) || /;/.test(trimmed)) {
    return { ok: false, error: "Apenas uma query SELECT é permitida." };
  }
  const projectId = await resolveProject(workspaceId);
  if (!projectId) return { ok: false, error: "Sem project ID configurado." };
  if (!accessToken()) {
    return { ok: false, error: "SUPABASE_ACCESS_TOKEN não configurado." };
  }
  const rows = await mgmtQuery(projectId, trimmed);
  if (!rows) return { ok: false, error: "Falha ao executar a query." };
  return { ok: true, rows };
}

/**
 * Recent activity for the workspace's project. A generic change feed needs an
 * audit log the target project may not have, so this is intentionally a stub
 * that returns nothing for now — wired as a function so the Council/UI can
 * adopt it once an activity source exists (phase next).
 */
export async function getWorkspaceRecentActivity(
  _workspaceId: string
): Promise<{ ok: boolean; events: never[]; message: string }> {
  return {
    ok: false,
    events: [],
    message: "Actividade recente ainda não disponível.",
  };
}
