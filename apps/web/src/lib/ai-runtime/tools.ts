import "server-only";
import {
  executeWorkspaceQuery,
  getWorkspaceTableSchema,
  getWorkspaceTables,
} from "@/lib/supabase-workspace-info";

/**
 * ATELIER — Council tools.
 *
 * Capabilities the Council can call against a workspace's own Supabase project.
 * Read-only by design: `execute_query` accepts a single SELECT and nothing else
 * — INSERT/UPDATE/DELETE/DDL require explicit human approval (a future flow).
 * All access is server-side via the Management API; credentials never surface.
 */

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export const supabaseTools = {
  async list_tables({ workspaceId }: { workspaceId: string }): Promise<ToolResult> {
    const r = await getWorkspaceTables(workspaceId);
    return r.ok
      ? { ok: true, data: { tables: r.tables, totalRows: r.totalRows } }
      : { ok: false, error: r.message ?? "Indisponível." };
  },

  async get_schema({
    workspaceId,
    table,
  }: {
    workspaceId: string;
    table: string;
  }): Promise<ToolResult> {
    const columns = await getWorkspaceTableSchema(workspaceId, table);
    if (!columns.length) {
      return { ok: false, error: "Tabela não encontrada ou sem acesso." };
    }
    return { ok: true, data: { table, columns } };
  },

  async execute_query({
    workspaceId,
    query,
  }: {
    workspaceId: string;
    query: string;
  }): Promise<ToolResult> {
    // SELECT-only — writes need explicit approval.
    if (!query.trim().toLowerCase().startsWith("select")) {
      return {
        ok: false,
        error: "Apenas queries SELECT são permitidas sem aprovação.",
      };
    }
    const r = await executeWorkspaceQuery(workspaceId, query);
    return r.ok ? { ok: true, data: { rows: r.rows } } : { ok: false, error: r.error };
  },
};

export type SupabaseTools = typeof supabaseTools;
