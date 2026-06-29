"use client";

import { useEffect, useState } from "react";
import { StateTag, ago } from "@/components/mission/bits";
import RepoPanel from "@/components/workspaces/RepoPanel";
import DatabasePanel from "@/components/workspaces/DatabasePanel";
import HomeDecisionActions from "@/components/shell/HomeDecisionActions";
import type { WorkspaceContext } from "@/lib/workspaces";
import type { RepoOverview } from "@/lib/github";
import type { Agent, Artifact, Decision } from "@/data/mission";

/**
 * ContextPanel — the workspace's right rail (ADR-0004, redesigned).
 *
 * Sections collapse/expand (state persisted per workspace in localStorage) so
 * the panel doesn't push useful content down. A non-collapsible "Requer acção"
 * block sits at the top whenever something needs the operator (pending
 * decisions, open PRs, a failed CI run). Each entry is a microcard; items that
 * need action carry a coloured left border.
 */

type SectionId =
  | "contexto"
  | "repo"
  | "db"
  | "decisoes"
  | "artefactos"
  | "licoes"
  | "agentes";

function CollapsibleSection({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="ctx-section">
      <button
        type="button"
        className="ctx-section-header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="ctx-section-chevron">{expanded ? "↓" : "›"}</span>
        <span className="ctx-section-title">{title}</span>
        {!expanded && count ? (
          <span className="ctx-section-count">{count}</span>
        ) : null}
      </button>
      {expanded ? <div className="ctx-section-body">{children}</div> : null}
    </section>
  );
}

function decisionDotClass(status: string): string {
  if (status === "pendente") return "ctx-dot-amber";
  if (status === "aprovada") return "ctx-dot-green";
  return "ctx-dot-neutral";
}

export default function ContextPanel({
  workspaceId,
  projectId,
  githubRepo,
  supabaseUrl,
  context,
  decisions,
  artifacts,
  agents,
  overview,
}: {
  workspaceId: string;
  /** When set, the panel is scoped to a project (repo + title wording). */
  projectId?: string;
  githubRepo?: string;
  supabaseUrl?: string;
  context: WorkspaceContext | null;
  decisions: Decision[];
  artifacts: Artifact[];
  agents: Agent[];
  /** Pre-fetched GitHub overview (workspace scope); omitted for projects. */
  overview?: RepoOverview | null;
}) {
  const isProject = Boolean(projectId);
  const summary = context?.summary?.trim() ?? "";
  const lessons = (context?.lessons ?? []).filter(
    (l): l is string => typeof l === "string" && l.trim().length > 0
  );

  const pendingDecisions = decisions.filter((d) => d.status === "pendente");
  const openPRs = overview?.prs ?? [];
  const ciFailed = overview?.ci?.state === "failure" ? overview.ci : null;
  const actionCount = pendingDecisions.length + openPRs.length + (ciFailed ? 1 : 0);

  // Default open/closed per section; Repo opens itself when it has open PRs.
  const defaults: Record<SectionId, boolean> = {
    contexto: false,
    repo: openPRs.length > 0,
    db: false,
    decisoes: true,
    artefactos: false,
    licoes: false,
    agentes: false,
  };

  const [open, setOpen] = useState<Partial<Record<SectionId, boolean>>>({});
  const storageKey = `atelier-ctx-${workspaceId}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setOpen(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const isOpen = (id: SectionId) => open[id] ?? defaults[id];
  const toggle = (id: SectionId) => {
    setOpen((prev) => {
      const next = { ...prev, [id]: !(prev[id] ?? defaults[id]) };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <aside className="ctx-panel">
      {/* Requer acção — always visible, only when there is something to do */}
      {actionCount > 0 ? (
        <section className="ctx-action">
          <div className="ctx-action-head">
            <span className="ctx-section-title">Requer acção</span>
            <span className="ctx-action-count">{actionCount}</span>
          </div>
          <div className="ctx-cards">
            {pendingDecisions.map((d) => (
              <div key={d.id} className="ctx-card ctx-card-amber">
                <span className="ctx-card-flag ctx-flag-amber">
                  Acção necessária
                </span>
                <span className="ctx-card-title">{d.title}</span>
                <div className="ctx-card-actions">
                  <HomeDecisionActions id={d.id} />
                </div>
              </div>
            ))}
            {openPRs.map((pr) => (
              <a
                key={`pr-${pr.number}`}
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="ctx-card ctx-card-violet"
              >
                <span className="ctx-card-flag ctx-flag-violet">PR aberto</span>
                <span className="ctx-card-title">{pr.title}</span>
                <span className="ctx-card-sub">
                  #{pr.number} · Ver PR →
                </span>
              </a>
            ))}
            {ciFailed ? (
              <a
                href={ciFailed.url}
                target="_blank"
                rel="noreferrer"
                className="ctx-card ctx-card-red"
              >
                <span className="ctx-card-flag ctx-flag-red">CI falhou</span>
                <span className="ctx-card-title">
                  {ciFailed.label}
                  {ciFailed.branch ? ` · ${ciFailed.branch}` : ""}
                </span>
                <span className="ctx-card-sub">Ver logs →</span>
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Context summary */}
      <CollapsibleSection
        title={isProject ? "Contexto do projecto" : "Contexto do workspace"}
        expanded={isOpen("contexto")}
        onToggle={() => toggle("contexto")}
      >
        {summary ? (
          <>
            <p className="ctx-summary">{summary}</p>
            {context ? (
              <p className="ctx-meta">
                v{context.version}
                {context.lastUpdatedAt ? ` · ${ago(context.lastUpdatedAt)}` : ""}
              </p>
            ) : null}
          </>
        ) : (
          <p className="ctx-empty">Sem memória ainda.</p>
        )}
      </CollapsibleSection>

      {/* Repository */}
      <CollapsibleSection
        title="Repositório"
        count={openPRs.length || undefined}
        expanded={isOpen("repo")}
        onToggle={() => toggle("repo")}
      >
        <RepoPanel
          scope={
            projectId
              ? { kind: "project", projectId, workspaceId }
              : { kind: "workspace", workspaceId }
          }
          initialRepo={githubRepo}
          overview={isProject ? undefined : overview}
        />
      </CollapsibleSection>

      {/* Database */}
      <CollapsibleSection
        title="Base de dados"
        expanded={isOpen("db")}
        onToggle={() => toggle("db")}
      >
        <DatabasePanel workspaceId={workspaceId} initialUrl={supabaseUrl} />
      </CollapsibleSection>

      {/* Decisions */}
      <CollapsibleSection
        title="Decisões"
        count={decisions.length || undefined}
        expanded={isOpen("decisoes")}
        onToggle={() => toggle("decisoes")}
      >
        {decisions.length === 0 ? (
          <p className="ctx-empty">Nada a decidir.</p>
        ) : (
          <div className="ctx-cards">
            {decisions.map((d) => {
              const pending = d.status === "pendente";
              return (
                <div
                  key={d.id}
                  className={`ctx-card${pending ? " ctx-card-amber" : ""}`}
                >
                  <span className="ctx-card-row">
                    <span className={`ctx-dot ${decisionDotClass(d.status)}`} />
                    <span className="ctx-card-title">{d.title}</span>
                  </span>
                  {pending ? (
                    <div className="ctx-card-actions">
                      <HomeDecisionActions id={d.id} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Artifacts */}
      <CollapsibleSection
        title="Artefactos"
        count={artifacts.length || undefined}
        expanded={isOpen("artefactos")}
        onToggle={() => toggle("artefactos")}
      >
        {artifacts.length === 0 ? (
          <p className="ctx-empty">Sem artefactos.</p>
        ) : (
          <div className="ctx-cards">
            {artifacts.map((a) => (
              <div key={a.id} className="ctx-card">
                <span className="ctx-card-row">
                  <span className="ctx-dot ctx-dot-violet" />
                  <span className="ctx-card-title">{a.title}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Lessons learned */}
      <CollapsibleSection
        title="Lições aprendidas"
        count={lessons.length || undefined}
        expanded={isOpen("licoes")}
        onToggle={() => toggle("licoes")}
      >
        {lessons.length === 0 ? (
          <p className="ctx-empty">Sem lições registadas.</p>
        ) : (
          <ul className="ctx-bullets">
            {lessons.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {/* Agents */}
      <CollapsibleSection
        title="Agentes"
        count={agents.length || undefined}
        expanded={isOpen("agentes")}
        onToggle={() => toggle("agentes")}
      >
        {agents.length === 0 ? (
          <p className="ctx-empty">Sem agentes atribuídos.</p>
        ) : (
          <div className="ctx-cards">
            {agents.map((a) => (
              <div key={a.id} className="ctx-card ctx-agent">
                <span className="ctx-card-title">{a.role}</span>
                <StateTag state={a.state} />
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </aside>
  );
}
