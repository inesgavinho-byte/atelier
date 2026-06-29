"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ago } from "@/components/mission/bits";
import {
  getProjectRepoOverview,
  getWorkspaceRepoOverview,
  setWorkspaceGithubRepo,
} from "@/app/(main)/workspaces/[workspaceId]/actions";
import { updateProject } from "@/app/(main)/workspaces/actions";
import type { RepoOverview } from "@/lib/github";

const REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/** Whether this panel manages a workspace's repo or a project's own repo. */
export type RepoScope =
  | { kind: "workspace"; workspaceId: string }
  | { kind: "project"; projectId: string; workspaceId: string };

/**
 * The "Repositório" section body (without its own header — the collapsible
 * wrapper owns the title). Shows a discreet "Ligar repositório" form when
 * unconfigured; when configured it renders the live overview (CI state, open
 * PRs and recent commits) as microcards. The overview can be passed in
 * (pre-fetched server-side) or fetched client-side when omitted.
 */
export default function RepoPanel({
  scope,
  initialRepo,
  overview: overviewProp,
}: {
  scope: RepoScope;
  initialRepo?: string;
  /** Pre-fetched overview; omit to let the panel fetch it itself. */
  overview?: RepoOverview | null;
}) {
  const router = useRouter();
  const [repo, setRepo] = useState(initialRepo ?? "");
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(initialRepo ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const selfFetch = overviewProp === undefined;
  const [fetched, setFetched] = useState<RepoOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const workspaceId = scope.workspaceId;
  const projectId = scope.kind === "project" ? scope.projectId : null;

  useEffect(() => {
    if (!selfFetch) return;
    let active = true;
    if (!repo) {
      setFetched(null);
      return;
    }
    setLoading(true);
    const p = projectId
      ? getProjectRepoOverview(projectId)
      : getWorkspaceRepoOverview(workspaceId);
    p.then((o) => active && setFetched(o))
      .catch(() => active && setFetched(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [repo, workspaceId, projectId, selfFetch]);

  const overview = selfFetch ? fetched : (overviewProp ?? null);

  const save = () => {
    setErr(null);
    const clean = input.trim();
    if (clean && !REPO_RE.test(clean)) {
      setErr('Formato inválido — usa "owner/repo".');
      return;
    }
    startSave(async () => {
      const r =
        scope.kind === "project"
          ? await updateProject({
              id: scope.projectId,
              workspaceId: scope.workspaceId,
              githubRepo: clean,
            })
          : await setWorkspaceGithubRepo(scope.workspaceId, clean);
      if (!r.ok) {
        setErr(r.message);
        return;
      }
      setRepo(clean);
      setEditing(false);
      router.refresh();
    });
  };

  if (!repo && !editing) {
    return (
      <button
        type="button"
        className="ctx-repo-link"
        onClick={() => {
          setInput("");
          setEditing(true);
        }}
      >
        Ligar repositório
      </button>
    );
  }

  if (editing) {
    return (
      <div className="ctx-repo-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !saving) save();
          }}
          placeholder="owner/repo"
          className="ctx-repo-input"
          autoFocus
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
          {repo ? (
            <button
              type="button"
              className="ctx-repo-btn-quiet"
              onClick={() => {
                setEditing(false);
                setInput(repo);
                setErr(null);
              }}
            >
              Cancelar
            </button>
          ) : null}
        </div>
        {err ? <p className="ctx-repo-err">{err}</p> : null}
      </div>
    );
  }

  return (
    <div className="ctx-repo">
      <div className="ctx-repo-head">
        <a
          href={overview?.url ?? `https://github.com/${repo}`}
          target="_blank"
          rel="noreferrer"
          className="ctx-repo-name"
        >
          {repo}
        </a>
        <button
          type="button"
          className="ctx-repo-edit"
          aria-label="Editar repositório"
          onClick={() => {
            setInput(repo);
            setEditing(true);
          }}
        >
          Editar
        </button>
      </div>

      {loading ? (
        <p className="ctx-empty">A carregar…</p>
      ) : !overview ? (
        <p className="ctx-empty">Sem dados do repositório.</p>
      ) : (
        <>
          {overview.ci ? (
            <a
              href={overview.ci.url}
              target="_blank"
              rel="noreferrer"
              className="ctx-card ctx-ci-card"
            >
              <span className="ctx-ci-row">
                <span className={`ctx-ci-dot ctx-ci-${overview.ci.state}`} />
                <span>
                  CI:{" "}
                  {overview.ci.state === "failure"
                    ? "falhou"
                    : overview.ci.label}
                </span>
                {overview.ci.branch ? (
                  <span className="ctx-ci-branch">{overview.ci.branch}</span>
                ) : null}
              </span>
            </a>
          ) : null}

          <div className="ctx-repo-group">
            <p className="ctx-repo-group-label">
              PRs abertos ({overview.prs.length})
            </p>
            {overview.prs.length === 0 ? (
              <p className="ctx-empty">Nenhum PR aberto.</p>
            ) : (
              <div className="ctx-cards">
                {overview.prs.map((pr) => (
                  <a
                    key={pr.number}
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ctx-card ctx-card-pr"
                  >
                    <span className="ctx-card-title">{pr.title}</span>
                    <span className="ctx-card-sub">
                      #{pr.number} · {pr.author}
                      {pr.createdAt ? ` · ${ago(pr.createdAt)}` : ""}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="ctx-repo-group">
            <p className="ctx-repo-group-label">Commits recentes</p>
            {overview.commits.length === 0 ? (
              <p className="ctx-empty">Sem commits.</p>
            ) : (
              <div className="ctx-cards">
                {overview.commits.map((c) => (
                  <a
                    key={c.sha}
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ctx-card"
                  >
                    <span className="ctx-card-title">{c.message}</span>
                    <span className="ctx-card-sub">
                      <span className="ctx-sha">{c.sha.slice(0, 7)}</span> ·{" "}
                      {c.author}
                      {c.date ? ` · ${ago(c.date)}` : ""}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
