"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconBrain,
  IconBrandGithub,
  IconDatabase,
  IconCheck,
  IconBox,
  IconBulb,
  IconRobot,
  IconFolders,
  IconFiles,
  IconChevronRight,
  IconChevronDown,
  IconX,
  IconMenu2,
  IconPlus,
  IconUpload,
  IconClock,
  type Icon,
} from "@tabler/icons-react";
import { StateTag, ago } from "@/components/mission/bits";
import RepoPanel from "@/components/workspaces/RepoPanel";
import FederatedReposPanel from "@/components/workspaces/FederatedReposPanel";
import type { FederatedRepo } from "@/lib/github";
import DatabasePanel from "@/components/workspaces/DatabasePanel";
import DocumentsPanel from "@/components/workspaces/DocumentsPanel";
import ArtifactDrawer from "@/components/workspaces/ArtifactDrawer";
import SessionsPanel from "@/components/workspaces/SessionsPanel";
import type { WorkspaceSession } from "@/lib/sessions-constants";
import HomeDecisionActions from "@/components/shell/HomeDecisionActions";
import { NewProjectForm } from "@/components/workspaces/WorkspaceForms";
import type { WorkspaceContext } from "@/lib/workspaces";
import type { WorkspaceProject } from "@/lib/workspaces-constants";
import type { WorkspaceDocument } from "@/lib/documents";
import type { RepoOverview } from "@/lib/github";
import type { Agent, Artifact, Decision } from "@/data/mission";

/**
 * ContextPanel — the workspace's right rail as a collapsible, full-height
 * drawer ("Contexto do workspace"). Expanded: a titled card whose rows are
 * collapsible sections (icon + label + hint + chevron), with "Novo projecto"
 * and "Carregar documentos" as actions at the foot. Collapsed: a slim vertical
 * tab — a toggle plus the section icons, each re-opening the drawer at its
 * section. Both the drawer state and per-section open state persist in
 * localStorage, scoped to the workspace.
 */

type SectionId =
  | "contexto"
  | "sessoes"
  | "repo"
  | "db"
  | "decisoes"
  | "artefactos"
  | "licoes"
  | "agentes"
  | "projectos"
  | "documentos";

function decisionDotClass(status: string): string {
  if (status === "pendente") return "ctx-dot-amber";
  if (status === "aprovada") return "ctx-dot-green";
  return "ctx-dot-neutral";
}

export default function ContextPanel({
  workspaceId,
  workspaceSlug,
  projectId,
  githubRepo,
  supabaseUrl,
  context,
  decisions,
  artifacts,
  agents,
  projects,
  documents,
  sessions,
  overview,
  isMain,
  federatedRepos,
  unlinkedWorkspaces,
}: {
  workspaceId: string;
  workspaceSlug?: string;
  /** When set, the panel is scoped to a project (repo + title wording). */
  projectId?: string;
  githubRepo?: string;
  supabaseUrl?: string;
  context: WorkspaceContext | null;
  decisions: Decision[];
  artifacts: Artifact[];
  agents: Agent[];
  /** Intentful sessions enable the "Sessões" section (ADR-0005 F2). */
  sessions?: WorkspaceSession[];
  /** Projects enable the "Projectos" section + "Novo projecto" (workspace scope). */
  projects?: WorkspaceProject[];
  /** Documents enable the "Documentos" section + "Carregar documentos". */
  documents?: WorkspaceDocument[];
  /** Pre-fetched GitHub overview (workspace scope); omitted for projects. */
  overview?: RepoOverview | null;
  /** The main workspace (OI): the Repositórios section shows every repo. */
  isMain?: boolean;
  /** Federated repo status for the OI panel (when isMain). */
  federatedRepos?: FederatedRepo[] | null;
  /** Workspaces with no repo yet (OI panel: link them from here). */
  unlinkedWorkspaces?: { id: string; name: string }[] | null;
}) {
  const isProject = Boolean(projectId);
  const summary = context?.summary?.trim() ?? "";
  const lessons = (context?.lessons ?? []).filter(
    (l): l is string => typeof l === "string" && l.trim().length > 0
  );

  const pendingDecisions = decisions.filter((d) => d.status === "pendente");
  const openPRs = overview?.prs ?? [];
  const hasProjects = projects !== undefined;
  const hasDocuments = documents !== undefined;
  const hasSessions = sessions !== undefined;
  const activeSessions = (sessions ?? []).filter((s) => s.state === "active");

  // Default open/closed per section. Decisões opens itself when something is
  // pending; Repositório opens itself when there are open PRs.
  const defaults: Record<SectionId, boolean> = {
    contexto: false,
    sessoes: activeSessions.length > 0,
    repo: openPRs.length > 0,
    db: false,
    decisoes: pendingDecisions.length > 0,
    artefactos: false,
    licoes: false,
    agentes: false,
    projectos: false,
    documentos: false,
  };

  const [open, setOpen] = useState<Partial<Record<SectionId, boolean>>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [openArtifact, setOpenArtifact] = useState<string | null>(null);
  // The embedded Documentos panel registers its file-picker opener here so the
  // foot "Carregar documentos" button can open the chooser directly.
  const docPickerRef = useRef<(() => void) | null>(null);
  const registerDocPicker = useCallback((open: () => void) => {
    docPickerRef.current = open;
  }, []);
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

  // Strip-icon click / foot action: expand the drawer and open that section.
  const expandTo = (id: SectionId) => {
    setOpen((prev) => {
      const next = { ...prev, [id]: true };
      persistOpen(next);
      return next;
    });
    setCollapsedPersist(false);
  };

  // ── Section definitions (drive both the strip and the expanded rows) ───────
  type Section = {
    id: SectionId;
    label: string;
    Icon: Icon;
    /** Right-aligned status hint shown in the row. */
    hint?: string;
    /** Badge on the collapsed strip icon. */
    badge?: number;
    show: boolean;
    body: React.ReactNode;
  };

  const sections: Section[] = [
    {
      id: "contexto",
      label: isProject ? "Contexto do projecto" : "Contexto",
      Icon: IconBrain,
      hint: summary ? (context ? `v${context.version}` : "memória") : "vazio",
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
      id: "sessoes",
      label: "Sessões",
      Icon: IconClock,
      hint: activeSessions.length
        ? `${activeSessions.length} activa${activeSessions.length === 1 ? "" : "s"}`
        : sessions?.length
          ? `${sessions.length}`
          : undefined,
      badge: activeSessions.length || undefined,
      show: hasSessions && !isProject,
      body: (
        <SessionsPanel workspaceId={workspaceId} sessions={sessions ?? []} />
      ),
    },
    {
      id: "repo",
      label: isMain ? "Repositórios" : "Repositório",
      Icon: IconBrandGithub,
      hint: isMain
        ? federatedRepos?.length
          ? `${federatedRepos.length}`
          : undefined
        : openPRs.length
          ? `${openPRs.length} PR`
          : undefined,
      badge: isMain
        ? federatedRepos?.length || undefined
        : openPRs.length || undefined,
      show: true,
      // OI (main workspace): federated status of every repo-linked workspace.
      body: isMain ? (
        <FederatedReposPanel
          repos={federatedRepos ?? []}
          unlinked={unlinkedWorkspaces ?? []}
        />
      ) : (
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
      hint: supabaseUrl ? "ligada" : undefined,
      show: true,
      body: <DatabasePanel workspaceId={workspaceId} initialUrl={supabaseUrl} />,
    },
    {
      id: "decisoes",
      label: "Decisões",
      Icon: IconCheck,
      hint: pendingDecisions.length
        ? `${pendingDecisions.length} pendente${pendingDecisions.length === 1 ? "" : "s"}`
        : "nada a decidir",
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
      id: "artefactos",
      label: "Artefactos",
      Icon: IconBox,
      hint: artifacts.length ? `${artifacts.length}` : undefined,
      badge: artifacts.length || undefined,
      show: true,
      body:
        artifacts.length === 0 ? (
          <p className="ctx-empty">Sem artefactos.</p>
        ) : (
          <div className="ctx-cards">
            {artifacts.map((a) => (
              <button
                key={a.id}
                type="button"
                className="ctx-card ctx-card-button"
                onClick={() => setOpenArtifact(a.id)}
              >
                <span className="ctx-card-row">
                  <span className="ctx-dot ctx-dot-violet" />
                  <span className="ctx-card-title">{a.title}</span>
                </span>
                <span className="ctx-card-sub">
                  {a.kind} · v{a.revision}
                  {a.updatedAt ? ` · ${ago(a.updatedAt)}` : ""}
                </span>
              </button>
            ))}
          </div>
        ),
    },
    {
      id: "licoes",
      label: "Lições aprendidas",
      Icon: IconBulb,
      hint: lessons.length ? `${lessons.length}` : undefined,
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
      hint: agents.length ? `${agents.length} ativos` : undefined,
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
    {
      id: "projectos",
      label: "Projectos",
      Icon: IconFolders,
      hint: projects?.length ? `${projects.length}` : undefined,
      badge: projects?.length || undefined,
      show: hasProjects,
      body: (
        <>
          <div className="ctx-projects-head">
            <button
              type="button"
              className="ctx-mini-action"
              onClick={() => setCreatingProject((v) => !v)}
            >
              {creatingProject ? "Fechar" : "+ Novo projecto"}
            </button>
          </div>
          {creatingProject ? (
            <div className="ctx-project-form">
              <NewProjectForm
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug ?? workspaceId}
                onCreated={() => setCreatingProject(false)}
              />
            </div>
          ) : null}
          {projects && projects.length > 0 ? (
            <div className="ctx-cards">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/workspaces/${workspaceSlug ?? workspaceId}/projects/${p.id}`}
                  className="ctx-card"
                >
                  <span className="ctx-card-title">{p.name}</span>
                  <span className="ctx-card-sub">
                    {p.status}
                    {p.updatedAt ? ` · ${ago(p.updatedAt)}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          ) : !creatingProject ? (
            <p className="ctx-empty">Ainda não há projectos.</p>
          ) : null}
        </>
      ),
    },
    {
      id: "documentos",
      label: "Documentos",
      Icon: IconFiles,
      hint: documents?.length ? `${documents.length}` : undefined,
      badge: documents?.length || undefined,
      show: hasDocuments,
      body: (
        <DocumentsPanel
          workspaceId={workspaceId}
          projectId={projectId}
          documents={documents ?? []}
          embedded
          registerPicker={registerDocPicker}
        />
      ),
    },
  ];

  const visible = sections.filter((s) => s.show);

  const drawer = openArtifact ? (
    <ArtifactDrawer
      artifactId={openArtifact}
      workspaceId={workspaceId}
      onClose={() => setOpenArtifact(null)}
    />
  ) : null;

  // ── Collapsed: a slim vertical tab (toggle + section icons) ────────────────
  if (collapsed) {
    return (
      <>
      <aside className="ctx-panel ctx-collapsed" aria-label="Contexto (recolhido)">
        <button
          type="button"
          className="ctx-strip-toggle"
          onClick={() => setCollapsedPersist(false)}
          aria-label="Abrir contexto"
          title="Abrir contexto"
        >
          <IconMenu2 size={17} stroke={1.7} />
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
      {drawer}
      </>
    );
  }

  // ── Expanded: the full drawer card ─────────────────────────────────────────
  return (
    <>
    <aside className="ctx-panel ctx-expanded" aria-label="Contexto do workspace">
      <div className="ctx-drawer-card">
        <div className="ctx-drawer-head">
          <span className="ctx-drawer-title">Contexto do workspace</span>
          <button
            type="button"
            className="ctx-strip-toggle"
            onClick={() => setCollapsedPersist(true)}
            aria-label="Recolher contexto"
            title="Recolher contexto"
          >
            <IconX size={16} stroke={1.8} />
          </button>
        </div>

        <div className="ctx-rows">
          {visible.map((s) => {
            const expanded = isOpen(s.id);
            return (
              <section key={s.id} className="ctx-section">
                <button
                  type="button"
                  className={`ctx-row${expanded ? " open" : ""}`}
                  onClick={() => toggle(s.id)}
                  aria-expanded={expanded}
                >
                  <s.Icon size={16} stroke={1.6} className="ctx-row-icon" />
                  <span className="ctx-row-label">{s.label}</span>
                  {s.hint && !expanded ? (
                    <span className="ctx-row-hint">{s.hint}</span>
                  ) : null}
                  <span className="ctx-row-chevron">
                    {expanded ? (
                      <IconChevronDown size={14} stroke={1.8} />
                    ) : (
                      <IconChevronRight size={14} stroke={1.8} />
                    )}
                  </span>
                </button>
                {expanded ? (
                  <div className="ctx-section-body">{s.body}</div>
                ) : null}
              </section>
            );
          })}
        </div>

        {hasProjects || hasDocuments ? (
          <div className="ctx-drawer-actions">
            {hasProjects ? (
              <button
                type="button"
                className="ctx-drawer-btn"
                onClick={() => {
                  setCreatingProject(true);
                  expandTo("projectos");
                }}
              >
                <IconPlus size={16} stroke={1.7} />
                Novo projecto
              </button>
            ) : null}
            {hasDocuments ? (
              <button
                type="button"
                className="ctx-drawer-btn"
                onClick={() => {
                  expandTo("documentos");
                  // Open the picker once the section has mounted/expanded.
                  window.setTimeout(() => docPickerRef.current?.(), 80);
                }}
              >
                <IconUpload size={16} stroke={1.7} />
                Carregar documentos
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
    {drawer}
    </>
  );
}
