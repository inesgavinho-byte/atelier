"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { ago } from "@/components/mission/bits";
import { setWorkspaceGithubRepo } from "@/app/(main)/workspaces/[workspaceId]/actions";
import type { FederatedRepo } from "@/lib/github";

/**
 * Federated repositories panel (OI main workspace). Read-only status for every
 * repo-linked workspace, plus management: edit/remove a link (pencil), link a
 * workspace that has none yet, and add a repo via a workspace picker. Writes go
 * through setWorkspaceGithubRepo; the list refreshes via router.refresh().
 */
const CI_DOT: Record<string, string> = {
  success: "fed-ci-green",
  failure: "fed-ci-red",
  pending: "fed-ci-amber",
  unknown: "fed-ci-grey",
};

const REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

export default function FederatedReposPanel({
  repos,
  unlinked,
}: {
  repos: FederatedRepo[];
  unlinked: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Inline edit state for an existing repo (by workspaceId) or a link-in-place.
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // "Add repo" form.
  const [adding, setAdding] = useState(false);
  const [addWs, setAddWs] = useState("");
  const [addRepo, setAddRepo] = useState("");

  const save = async (workspaceId: string, repo: string) => {
    setBusy(true);
    setMsg(null);
    const r = await setWorkspaceGithubRepo(workspaceId, repo);
    setMsg(r.message);
    if (r.ok) {
      setEditing(null);
      setAdding(false);
      setAddWs("");
      setAddRepo("");
      router.refresh();
    }
    setBusy(false);
  };

  const beginEdit = (workspaceId: string, current: string) => {
    setEditing(workspaceId);
    setEditValue(current);
    setMsg(null);
  };

  return (
    <div className="fed-repos">
      {repos.map((r) => (
        <div key={r.workspaceId || r.repo} className="fed-repo">
          {editing === r.workspaceId ? (
            <div className="fed-edit">
              <input
                className="fed-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="owner/repo"
                disabled={busy}
                spellCheck={false}
              />
              <div className="fed-edit-actions">
                <button
                  type="button"
                  className="action"
                  disabled={busy || !REPO_RE.test(editValue.trim())}
                  onClick={() => save(r.workspaceId, editValue.trim())}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="artifact-revision-link"
                  disabled={busy}
                  onClick={() => save(r.workspaceId, "")}
                >
                  remover
                </button>
                <button
                  type="button"
                  className="artifact-revision-link"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="fed-repo-head">
                <span
                  className={`fed-ci ${CI_DOT[r.ci?.state ?? "unknown"]}`}
                  title={r.ci?.label ?? "CI desconhecido"}
                />
                <span className="fed-repo-ws">{r.workspaceName}</span>
                <a className="fed-repo-link" href={r.url} target="_blank" rel="noreferrer">
                  {r.repo}
                </a>
                {r.prCount > 0 ? (
                  <span className="fed-repo-prs">{r.prCount} PR</span>
                ) : null}
                {r.workspaceId ? (
                  <button
                    type="button"
                    className="fed-edit-btn"
                    aria-label="Editar repositório"
                    title="Editar"
                    onClick={() => beginEdit(r.workspaceId, r.repo)}
                  >
                    <IconPencil size={14} stroke={1.7} />
                  </button>
                ) : null}
              </div>
              {r.lastCommit ? (
                <a className="fed-repo-commit" href={r.lastCommit.url} target="_blank" rel="noreferrer">
                  {r.lastCommit.message}
                  {r.lastCommit.date ? (
                    <span className="fed-repo-date"> · {ago(r.lastCommit.date)}</span>
                  ) : null}
                </a>
              ) : (
                <span className="fed-repo-commit fed-repo-muted">sem commits recentes</span>
              )}
            </>
          )}
        </div>
      ))}

      {/* Workspaces without a repo — link in place. */}
      {unlinked.map((w) => (
        <div key={w.id} className="fed-repo fed-repo-empty">
          {editing === w.id ? (
            <div className="fed-edit">
              <input
                className="fed-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="owner/repo"
                disabled={busy}
                spellCheck={false}
              />
              <div className="fed-edit-actions">
                <button
                  type="button"
                  className="action"
                  disabled={busy || !REPO_RE.test(editValue.trim())}
                  onClick={() => save(w.id, editValue.trim())}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="artifact-revision-link"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="fed-repo-head">
              <span className="fed-ci fed-ci-grey" title="Sem repositório" />
              <span className="fed-repo-ws">{w.name}</span>
              <span className="fed-repo-muted">sem repositório</span>
              <button
                type="button"
                className="fed-link-btn"
                onClick={() => beginEdit(w.id, "")}
                disabled={busy}
              >
                ligar
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add a repo by picking a workspace. */}
      {adding ? (
        <div className="fed-add">
          <select
            value={addWs}
            onChange={(e) => setAddWs(e.target.value)}
            disabled={busy}
            aria-label="Workspace"
          >
            <option value="">Workspace…</option>
            {unlinked.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <input
            className="fed-input"
            value={addRepo}
            onChange={(e) => setAddRepo(e.target.value)}
            placeholder="owner/repo"
            disabled={busy}
            spellCheck={false}
          />
          <div className="fed-edit-actions">
            <button
              type="button"
              className="action"
              disabled={busy || !addWs || !REPO_RE.test(addRepo.trim())}
              onClick={() => save(addWs, addRepo.trim())}
            >
              Guardar
            </button>
            <button
              type="button"
              className="artifact-revision-link"
              disabled={busy}
              onClick={() => setAdding(false)}
            >
              cancelar
            </button>
          </div>
        </div>
      ) : unlinked.length ? (
        <button
          type="button"
          className="fed-add-btn"
          onClick={() => {
            setAdding(true);
            setMsg(null);
          }}
          disabled={busy}
        >
          <IconPlus size={14} stroke={1.8} /> Adicionar repo
        </button>
      ) : null}

      {repos.length === 0 && unlinked.length === 0 ? (
        <p className="ctx-empty">Nenhum workspace disponível.</p>
      ) : null}
      {msg ? <p className="fed-msg">{msg}</p> : null}
    </div>
  );
}
