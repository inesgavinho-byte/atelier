"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ago } from "@/components/mission/bits";
import {
  getWorkspaceRepoOverview,
  setWorkspaceGithubRepo,
} from "@/app/(main)/workspaces/[workspaceId]/actions";
import type { RepoOverview } from "@/lib/github";

const REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/**
 * The "Repositório" section of the workspace context panel. When no repo is
 * configured it shows a discreet "Ligar repositório" link that reveals an
 * owner/repo field. When configured it loads the live overview (open PRs,
 * recent commits, CI state) via a server action, with a loading state and a
 * silent empty state if the API is unreachable.
 */
export default function RepoPanel({
  workspaceId,
  initialRepo,
}: {
  workspaceId: string;
  initialRepo?: string;
}) {
  const router = useRouter();
  const [repo, setRepo] = useState(initialRepo ?? "");
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(initialRepo ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const [overview, setOverview] = useState<RepoOverview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!repo) {
      setOverview(null);
      return;
    }
    setLoading(true);
    getWorkspaceRepoOverview(workspaceId)
      .then((o) => {
        if (active) setOverview(o);
      })
      .catch(() => {
        if (active) setOverview(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repo, workspaceId]);

  const save = () => {
    setErr(null);
    const clean = input.trim();
    if (clean && !REPO_RE.test(clean)) {
      setErr('Formato inválido — usa "owner/repo".');
      return;
    }
    startSave(async () => {
      const r = await setWorkspaceGithubRepo(workspaceId, clean);
      if (!r.ok) {
        setErr(r.message);
        return;
      }
      setRepo(clean);
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <section className="ctx-section">
      <h2 className="ctx-section-title">Repositório</h2>

      {!repo && !editing ? (
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
      ) : editing ? (
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
      ) : (
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
                  className="ctx-ci"
                >
                  <span className={`ctx-ci-dot ctx-ci-${overview.ci.state}`} />
                  <span>CI: {overview.ci.label}</span>
                  {overview.ci.branch ? (
                    <span className="ctx-ci-branch">{overview.ci.branch}</span>
                  ) : null}
                </a>
              ) : null}

              <div className="ctx-repo-group">
                <p className="ctx-repo-group-label">
                  PRs abertos ({overview.prs.length})
                </p>
                {overview.prs.length === 0 ? (
                  <p className="ctx-empty">Nenhum PR aberto.</p>
                ) : (
                  <ul className="ctx-repo-items">
                    {overview.prs.map((pr) => (
                      <li key={pr.number}>
                        <a href={pr.url} target="_blank" rel="noreferrer">
                          {pr.title}
                        </a>
                        <span className="ctx-repo-sub">
                          #{pr.number} · {pr.author}
                          {pr.createdAt ? ` · ${ago(pr.createdAt)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="ctx-repo-group">
                <p className="ctx-repo-group-label">Commits recentes</p>
                {overview.commits.length === 0 ? (
                  <p className="ctx-empty">Sem commits.</p>
                ) : (
                  <ul className="ctx-repo-items">
                    {overview.commits.map((c) => (
                      <li key={c.sha}>
                        <a href={c.url} target="_blank" rel="noreferrer">
                          {c.message}
                        </a>
                        <span className="ctx-repo-sub">
                          {c.sha} · {c.author}
                          {c.date ? ` · ${ago(c.date)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
