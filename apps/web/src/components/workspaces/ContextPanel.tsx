"use client";

import { useEffect, useState } from "react";
import {
  IconCheck,
  IconFiles,
  IconBrandGithub,
  IconDatabase,
  IconBrain,
  IconBox,
  IconBulb,
  IconRobot,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  type Icon,
} from "@tabler/icons-react";
import { StateTag, ago } from "@/components/mission/bits";
import RepoPanel from "@/components/workspaces/RepoPanel";
import DatabasePanel from "@/components/workspaces/DatabasePanel";
import DocumentsPanel from "@/components/workspaces/DocumentsPanel";
import HomeDecisionActions from "@/components/shell/HomeDecisionActions";
import type { WorkspaceContext } from "@/lib/workspaces";
import type { WorkspaceDocument } from "@/lib/documents";
import type { RepoOverview } from "@/lib/github";
import type { Agent, Artifact, Decision } from "@/data/mission";

/**
 * ContextPanel — the workspace's right rail, redesigned as a collapsible
 * full-height drawer (Claude.ai files / Perplexity sources inspired).
 *
 * Expanded (280px): every section stacks vertically, each with a clickable
 * uppercase header (icon + label + chevron). Collapsed (36px): only a vertical
 * strip of section icons remains — clicking one re-expands the drawer at that
 * section. Both the whole-drawer collapse and per-section open state persist in
 * localStorage, scoped to the workspace.
 */

type SectionId =
  | "decisoes"
  | "documentos"
  | "repo"
  | "db"
  | "contexto"
  | "artefactos"
  | "licoes"
  | "agentes";

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
  documents,
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
  /** Documents enable the "Documentos" section (workspace scope only). */
  documents?: WorkspaceDocument[];
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
  const hasDocuments = documents !== undefined;

  // Default open/closed per section. Decisões opens itself when something is
  // pending; Repositório opens itself when there are open PRs.
  const defaults: Record<SectionId, boolean> = {
    decisoes: pendingDecisions.length > 0,
    documentos: false,
    repo: openPRs.length > 0,
    db: false,
    contexto: false,
    artefactos: false,
    licoes: false,
    agentes: false,
  };

  const [open, setOpen] = useState<Partial<Record<SectionId, boolean>>>({});
  const [collapsed, setCollapsed] = useState(false);
  const openKey = `atelier-ctx-${workspaceId}`;
  const collapsedKey = `atelier-ctx-collapsed-${workspaceId}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(openKey);
      if (raw) setOpen(JSON.parse(raw));
      setCollapsed(window.localStorage.getItem(collapsedKey) === "1");
    } catch {
      /* ignore */
    }
  }, [openKey, collapsedKey]);

  const isOpen = (id: SectionId) => open[id] ?? defaults[id];

  const persistOpen = (next: Partial<Record<SectionId, boolean>>) => {
    try {
      window.localStorage.setItem(openKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const toggle = (id: SectionId) =>
    setOpen((prev) => {
      const next = { ...prev, [id]: !(prev[id] ?? defaults[id]) };
      persistOpen(next);
      return next;
    });

  const setCollapsedPersist = (v: boolean) => {
    setCollapsed(v);
    try {
      window.localStorage.setItem(collapsedKey, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  // Strip-icon click: expand the drawer and open that section.
  const expandTo = (id: SectionId) => {
    setOpen((prev) => {
      const next = { ...prev, [id]: true };
      persistOpen(next);
      return next;
    });
    setCollapsedPersist(false);
  };

  // ── Section definitions (drives both the strip and the expanded body) ──────
  type Section = {
    id: SectionId;
    label: string;
    Icon: Icon;
    /** Badge on the strip icon + count in the header. */
    badge?: number;
    /** Hidden entirely when false (e.g. Documentos outside workspace scope). */
    show: boolean;
    body: React.ReactNode;
  };

  const sections: Section[] = [
    {
      id: "decisoes",
      label: "Decisões",
      Icon: IconCheck,
      badge: pendingDecisions.length || undefined,
      show: true,
      body:
        decisions.length === 0 ? (
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
        ),
    },
    {
      id: "documentos",
      label: "Documentos",
      Icon: IconFiles,
      badge: documents?.length || undefined,
      show: hasDocuments,
      body: (
        <DocumentsPanel
          workspaceId={workspaceId}
          documents={documents ?? []}
          embedded
        />
      ),
    },
    {
      id: "repo",
      label: "Repositório",
      Icon: IconBrandGithub,
      badge: openPRs.length || undefined,
      show: true,
      body: (
        <RepoPanel
          scope={
            projectId
              ? { kind: "project", projectId, workspaceId }
              : { kind: "workspace", workspaceId }
          }
          initialRepo={githubRepo}
          overview={isProject ? undefined : overview}
        />
      ),
    },
    {
      id: "db",
      label: "Base de dados",
      Icon: IconDatabase,
      show: true,
      body: <DatabasePanel workspaceId={workspaceId} initialUrl={supabaseUrl} />,
    },
    {
      id: "contexto",
      label: isProject ? "Contexto do projecto" : "Contexto",
      Icon: IconBrain,
      show: true,
      body: summary ? (
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
      ),
    },
    {
      id: "artefactos",
      label: "Artefactos",
      Icon: IconBox,
      badge: artifacts.length || undefined,
      show: true,
      body:
        artifacts.length === 0 ? (
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
        ),
    },
    {
      id: "licoes",
      label: "Lições aprendidas",
      Icon: IconBulb,
      badge: lessons.length || undefined,
      show: true,
      body:
        lessons.length === 0 ? (
          <p className="ctx-empty">Sem lições registadas.</p>
        ) : (
          <ul className="ctx-bullets">
            {lessons.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        ),
    },
    {
      id: "agentes",
      label: "Agentes",
      Icon: IconRobot,
      badge: agents.length || undefined,
      show: true,
      body:
        agents.length === 0 ? (
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
        ),
    },
  ];

  const visible = sections.filter((s) => s.show);

  // ── Collapsed: a narrow vertical strip of section icons ────────────────────
  if (collapsed) {
    return (
      <aside className="ctx-panel ctx-collapsed" aria-label="Contexto (recolhido)">
        <button
          type="button"
          className="ctx-strip-toggle"
          onClick={() => setCollapsedPersist(false)}
          aria-label="Expandir painel"
          title="Expandir painel"
        >
          <IconChevronRight size={16} stroke={1.8} />
        </button>
        <div className="ctx-strip">
          {visible.map((s) => (
            <button
              key={s.id}
              type="button"
              className="ctx-strip-icon"
              onClick={() => expandTo(s.id)}
              aria-label={s.label}
              title={s.label}
            >
              <s.Icon size={18} stroke={1.6} />
              {s.badge ? <span className="ctx-strip-badge">{s.badge}</span> : null}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  // ── Expanded: full drawer ──────────────────────────────────────────────────
  return (
    <aside className="ctx-panel ctx-expanded" aria-label="Contexto">
      <div className="ctx-drawer-head">
        <button
          type="button"
          className="ctx-strip-toggle"
          onClick={() => setCollapsedPersist(true)}
          aria-label="Recolher painel"
          title="Recolher painel"
        >
          <IconChevronLeft size={16} stroke={1.8} />
        </button>
      </div>

      <div className="ctx-sections">
        {visible.map((s) => {
          const expanded = isOpen(s.id);
          return (
            <section key={s.id} className="ctx-section">
              <button
                type="button"
                className="ctx-section-header"
                onClick={() => toggle(s.id)}
                aria-expanded={expanded}
              >
                <s.Icon size={15} stroke={1.6} className="ctx-section-icon" />
                <span className="ctx-section-title">{s.label}</span>
                {s.badge ? (
                  <span className="ctx-section-count">{s.badge}</span>
                ) : null}
                <span className="ctx-section-chevron">
                  {expanded ? (
                    <IconChevronDown size={13} stroke={1.8} />
                  ) : (
                    <IconChevronRight size={13} stroke={1.8} />
                  )}
                </span>
              </button>
              {expanded ? <div className="ctx-section-body">{s.body}</div> : null}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
