"use client";

import { ago } from "@/components/mission/bits";
import type { FederatedRepo } from "@/lib/github";

/**
 * Federated repositories panel (OI main workspace). One compact line per
 * repo-linked workspace: name, repo, CI traffic light, open-PR count and the
 * last commit. Read-only; data is fetched server-side and cached 5 min.
 */
const CI_DOT: Record<string, string> = {
  success: "fed-ci-green",
  failure: "fed-ci-red",
  pending: "fed-ci-amber",
  unknown: "fed-ci-grey",
};

export default function FederatedReposPanel({ repos }: { repos: FederatedRepo[] }) {
  if (!repos.length) {
    return (
      <p className="ctx-empty">
        Nenhum workspace com repositório ligado. Liga o github_repo em cada
        workspace.
      </p>
    );
  }
  return (
    <div className="fed-repos">
      {repos.map((r) => (
        <div key={r.repo} className="fed-repo">
          <div className="fed-repo-head">
            <span
              className={`fed-ci ${CI_DOT[r.ci?.state ?? "unknown"]}`}
              title={r.ci?.label ?? "CI desconhecido"}
            />
            <span className="fed-repo-ws">{r.workspaceName}</span>
            <a
              className="fed-repo-link"
              href={r.url}
              target="_blank"
              rel="noreferrer"
            >
              {r.repo}
            </a>
            {r.prCount > 0 ? (
              <span className="fed-repo-prs">{r.prCount} PR</span>
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
        </div>
      ))}
    </div>
  );
}
