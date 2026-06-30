"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  autoMapOne,
  importConversations,
} from "@/app/(main)/import/actions";

interface WorkspaceOption {
  id: string;
  name: string;
}

interface Preview {
  externalId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  duplicate: boolean;
}

interface BatchPreview {
  batchId: string;
  source: string;
  truncated: boolean;
  conversations: Preview[];
}

interface Row {
  selected: boolean;
  workspaceId: string;
}

interface ResultRow {
  externalId: string;
  title: string;
  ok: boolean;
  skipped?: boolean;
  decisions?: number;
  artifacts?: number;
  message?: string;
}

const SOURCE_LABEL: Record<string, string> = {
  claude: "Claude.ai",
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
};
const MAX_SELECTED = 100;
const CHUNK = 5;
/** Netlify synchronous functions cap the request body at ~6 MB. */
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-PT");
  } catch {
    return "";
  }
}

export default function ImportClient({
  workspaces,
}: {
  workspaces: WorkspaceOption[];
}) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchPreview | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [force, setForce] = useState(false);
  const [mapping, startMapping] = useTransition();

  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ResultRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(
    () => Object.entries(rows).filter(([, r]) => r.selected).map(([id]) => id),
    [rows]
  );

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);

    // The serverless function (Netlify) rejects request bodies over ~6 MB
    // *before* our handler runs, so the response isn't our JSON and the real
    // reason gets swallowed. Catch oversized files up front with a clear path
    // forward — a full Claude/ChatGPT export ZIP often exceeds this.
    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      setErr(
        `Ficheiro demasiado grande (${mb} MB). O limite do servidor é ~6 MB. ` +
          `Exporta um intervalo menor, ou abre o ZIP e envia só o ` +
          `conversations.json (sem o resto do export).`
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      // Read as text first: a platform-level rejection (size, gateway) returns
      // an HTML/empty body, and res.json() would throw and hide the status.
      const raw = await res.text();
      let data: { error?: string } & Partial<BatchPreview> = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        /* non-JSON body (platform error page) — handled below via status */
      }
      if (!res.ok) {
        setErr(
          data.error ??
            (res.status === 413 || res.status === 400
              ? "Ficheiro demasiado grande ou inválido para o servidor (~6 MB). " +
                "Envia só o conversations.json, ou um intervalo menor."
              : `Falha no upload (HTTP ${res.status}).`)
        );
        return;
      }
      const b = data as BatchPreview;
      setBatch(b);
      setRows(
        Object.fromEntries(
          b.conversations.map((c) => [
            c.externalId,
            { selected: !c.duplicate, workspaceId: "" },
          ])
        )
      );
      setStep("preview");
    } catch {
      setErr("Falha no upload — verifica a ligação e tenta novamente.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const autoDetect = () => {
    if (!batch) return;
    const targets = selectedIds.filter((id) => !rows[id].workspaceId);
    startMapping(async () => {
      for (const id of targets) {
        const r = await autoMapOne(batch.batchId, id);
        if (r.workspaceId) setRow(id, { workspaceId: r.workspaceId });
      }
    });
  };

  const runImport = async () => {
    if (!batch) return;
    const items = selectedIds
      .filter((id) => rows[id].workspaceId)
      .slice(0, MAX_SELECTED)
      .map((id) => ({ externalId: id, workspaceId: rows[id].workspaceId }));
    if (!items.length) {
      setErr("Selecciona conversas e atribui um workspace a cada uma.");
      return;
    }
    setErr(null);
    setImporting(true);
    setProgress({ done: 0, total: items.length });
    const acc: ResultRow[] = [];
    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);
      const res = await importConversations(batch.batchId, chunk, force);
      acc.push(...res);
      setProgress({ done: Math.min(i + CHUNK, items.length), total: items.length });
    }
    setResults(acc);
    setImporting(false);
    setStep("done");
  };

  const summary = useMemo(() => {
    const imported = results.filter((r) => r.ok && !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.ok).length;
    const decisions = results.reduce((n, r) => n + (r.decisions ?? 0), 0);
    const artifacts = results.reduce((n, r) => n + (r.artifacts ?? 0), 0);
    return { imported, skipped, failed, decisions, artifacts };
  }, [results]);

  /* ── Upload ─────────────────────────────────────────────────────────────── */
  if (step === "upload") {
    return (
      <div className="import-upload">
        <p className="import-step-label">1 · Upload</p>
        <label className="import-dropzone">
          <input
            ref={fileRef}
            type="file"
            accept=".zip,.json,application/zip,application/json"
            onChange={onUpload}
            disabled={uploading}
          />
          <span className="import-dropzone-title">
            {uploading ? "A processar…" : "Escolher ficheiro (.zip ou .json)"}
          </span>
          <span className="import-dropzone-sub">
            Claude.ai / ChatGPT → Settings → Export data · Perplexity → Export
            <br />
            Máx. ~6 MB — se o export for maior, envia só o conversations.json.
          </span>
        </label>
        {err ? <p className="import-err">{err}</p> : null}
      </div>
    );
  }

  /* ── Preview + mapping ────────────────────────────────────────────────────── */
  if (step === "preview" && batch) {
    return (
      <div className="import-preview">
        <div className="import-toolbar">
          <div>
            <p className="import-step-label">2 · Conversas</p>
            <p className="import-meta">
              {SOURCE_LABEL[batch.source] ?? batch.source} ·{" "}
              {batch.conversations.length} conversas · {selectedIds.length}{" "}
              seleccionadas
              {batch.truncated ? " · upload truncado a 500" : ""}
            </p>
          </div>
          <div className="import-toolbar-actions">
            <button
              type="button"
              className="import-btn-soft"
              onClick={autoDetect}
              disabled={mapping}
            >
              {mapping ? "A mapear…" : "Auto-detectar workspaces"}
            </button>
            <label className="import-force">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
              />
              Actualizar duplicados
            </label>
            <button
              type="button"
              className="import-btn"
              onClick={runImport}
              disabled={importing}
            >
              {importing
                ? `A importar… ${progress.done}/${progress.total}`
                : "Importar seleccionadas"}
            </button>
          </div>
        </div>

        {importing ? (
          <div className="import-progress">
            <div
              className="import-progress-bar"
              style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        ) : null}
        {err ? <p className="import-err">{err}</p> : null}

        <div className="import-table-scroll">
          <table className="import-table">
            <thead>
              <tr>
                <th></th>
                <th>Conversa</th>
                <th>Data</th>
                <th>Msgs</th>
                <th>Workspace</th>
              </tr>
            </thead>
            <tbody>
              {batch.conversations.map((c) => {
                const row = rows[c.externalId];
                return (
                  <tr key={c.externalId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={row?.selected ?? false}
                        onChange={(e) =>
                          setRow(c.externalId, { selected: e.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <span className="import-title">{c.title}</span>
                      {c.duplicate ? (
                        <span className="import-dup">já importada</span>
                      ) : null}
                    </td>
                    <td className="import-cell-muted">{fmtDate(c.createdAt)}</td>
                    <td className="import-cell-muted">{c.messageCount}</td>
                    <td>
                      <select
                        value={row?.workspaceId ?? ""}
                        onChange={(e) =>
                          setRow(c.externalId, { workspaceId: e.target.value })
                        }
                      >
                        <option value="">— Escolher —</option>
                        {workspaces.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Result ─────────────────────────────────────────────────────────────── */
  return (
    <div className="import-done">
      <p className="import-step-label">3 · Resultado</p>
      <p className="import-result-line">
        {summary.imported} conversas importadas · {summary.decisions} decisões ·{" "}
        {summary.artifacts} artefactos extraídos
        {summary.skipped ? ` · ${summary.skipped} saltadas` : ""}
        {summary.failed ? ` · ${summary.failed} falharam` : ""}
      </p>
      <ul className="import-result-list">
        {results.map((r) => (
          <li key={r.externalId}>
            <span
              className={`import-dot ${
                r.ok ? (r.skipped ? "import-dot-skip" : "import-dot-ok") : "import-dot-fail"
              }`}
            />
            <span className="import-title">{r.title || r.externalId}</span>
            <span className="import-cell-muted">
              {r.skipped
                ? "saltada (duplicada)"
                : r.ok
                  ? `${r.decisions ?? 0} decisões · ${r.artifacts ?? 0} artefactos`
                  : r.message ?? "falhou"}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="import-btn-soft"
        onClick={() => {
          setStep("upload");
          setBatch(null);
          setRows({});
          setResults([]);
          setErr(null);
        }}
      >
        Importar outro ficheiro
      </button>
    </div>
  );
}
