"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getWorkspaceDatabaseInfo,
  setWorkspaceSupabase,
} from "@/app/(main)/workspaces/[workspaceId]/supabase-actions";
import type { WorkspaceDbInfo } from "@/lib/supabase-workspace";

/**
 * "Base de dados" section of the workspace context panel. Mirrors RepoPanel:
 * a discreet "Ligar Supabase" form when unconfigured, and the live project
 * info (connection, tables, rows, dashboard link) when set — with a loading
 * state and a silent empty state when the API is unreachable.
 */
export default function DatabasePanel({
  workspaceId,
  initialUrl,
}: {
  workspaceId: string;
  initialUrl?: string;
}) {
  const router = useRouter();
  const [configured, setConfigured] = useState(Boolean(initialUrl));
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [anon, setAnon] = useState("");
  const [projectId, setProjectId] = useState("");
  const [serviceRole, setServiceRole] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const [info, setInfo] = useState<WorkspaceDbInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!configured) {
      setInfo(null);
      return;
    }
    setLoading(true);
    getWorkspaceDatabaseInfo(workspaceId)
      .then((i) => active && setInfo(i))
      .catch(() => active && setInfo(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [configured, workspaceId]);

  const save = () => {
    setErr(null);
    if (!url.trim() || !anon.trim()) {
      setErr("URL e Anon Key são obrigatórios.");
      return;
    }
    startSave(async () => {
      const r = await setWorkspaceSupabase(workspaceId, {
        url,
        anonKey: anon,
        projectId: projectId || undefined,
        serviceRoleKey: serviceRole || undefined,
      });
      if (!r.ok) {
        setErr(r.message);
        return;
      }
      setConfigured(true);
      setEditing(false);
      setAnon("");
      setServiceRole("");
      router.refresh();
    });
  };

  return (
    <section className="ctx-section">
      <h2 className="ctx-section-title">Base de dados</h2>

      {!configured && !editing ? (
        <button
          type="button"
          className="ctx-repo-link"
          onClick={() => setEditing(true)}
        >
          Ligar Supabase
        </button>
      ) : editing ? (
        <div className="ctx-repo-form">
          <input
            className="ctx-repo-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxx.supabase.co"
            autoFocus
          />
          <input
            className="ctx-repo-input"
            type="password"
            value={anon}
            onChange={(e) => setAnon(e.target.value)}
            placeholder="Anon key (publishable)"
          />
          <input
            className="ctx-repo-input"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Project ID (opcional — derivado do URL)"
          />
          <input
            className="ctx-repo-input"
            type="password"
            value={serviceRole}
            onChange={(e) => setServiceRole(e.target.value)}
            placeholder="Service role key (opcional)"
          />
          <div className="ctx-repo-form-actions">
            <button
              type="button"
              className="ctx-repo-btn"
              onClick={save}
              disabled={saving}
            >
              {saving ? "A guardar…" : "Guardar"}
            </button>
            {configured ? (
              <button
                type="button"
                className="ctx-repo-btn-quiet"
                onClick={() => {
                  setEditing(false);
                  setErr(null);
                }}
              >
                Cancelar
              </button>
            ) : null}
          </div>
          {err ? <p className="ctx-repo-err">{err}</p> : null}
        </div>
      ) : (
        <div className="ctx-repo">
          <div className="ctx-repo-head">
            <a
              href={info?.dashboardUrl ?? info?.url ?? initialUrl}
              target="_blank"
              rel="noreferrer"
              className="ctx-repo-name"
            >
              {info?.projectId ?? info?.url ?? initialUrl}
            </a>
            <button
              type="button"
              className="ctx-repo-edit"
              onClick={() => {
                setUrl(info?.url ?? initialUrl ?? "");
                setProjectId(info?.projectId ?? "");
                setEditing(true);
              }}
            >
              Editar
            </button>
          </div>

          {loading ? (
            <p className="ctx-empty">A carregar…</p>
          ) : !info ? (
            <p className="ctx-empty">Sem dados da base de dados.</p>
          ) : (
            <>
              <span className="ctx-ci">
                <span
                  className={`ctx-ci-dot ctx-ci-${
                    info.connection === "ok"
                      ? "success"
                      : info.connection === "error"
                        ? "failure"
                        : "unknown"
                  }`}
                />
                <span>
                  {info.connection === "ok"
                    ? "Ligada"
                    : info.connection === "error"
                      ? "Inacessível"
                      : "Estado desconhecido"}
                </span>
              </span>
              {info.tableCount != null ? (
                <p className="ctx-repo-sub">
                  {info.tableCount}{" "}
                  {info.tableCount === 1 ? "tabela" : "tabelas"}
                  {info.totalRows != null
                    ? ` · ~${info.totalRows.toLocaleString("pt-PT")} registos`
                    : ""}
                </p>
              ) : (
                <p className="ctx-repo-sub">
                  Define SUPABASE_ACCESS_TOKEN para ver tabelas e contagens.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
