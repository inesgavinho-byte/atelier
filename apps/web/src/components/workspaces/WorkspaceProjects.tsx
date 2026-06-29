"use client";

import { useState } from "react";
import Link from "next/link";
import { ago } from "@/components/mission/bits";
import { NewProjectForm } from "@/components/workspaces/WorkspaceForms";
import type { WorkspaceProject } from "@/lib/workspaces-constants";

/**
 * The "Projectos" section of a workspace page (ADR-0005 F1): a list of the
 * workspace's projects with status and last update, plus a collapsible
 * "Novo projecto" form. Each card opens the project's own continuous chat.
 */
export default function WorkspaceProjects({
  workspaceId,
  workspaceSlug,
  projects,
}: {
  workspaceId: string;
  workspaceSlug: string;
  projects: WorkspaceProject[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <section className="ws-projects">
      <div className="ws-projects-head">
        <h2 className="eyebrow">Projectos</h2>
        <button
          type="button"
          className="ws-header-chip"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "Fechar" : "+ Novo projecto"}
        </button>
      </div>

      {creating ? (
        <div className="ws-projects-form panel p-5">
          <NewProjectForm
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            onCreated={() => setCreating(false)}
          />
        </div>
      ) : null}

      {projects.length === 0 ? (
        !creating ? (
          <p className="ctx-empty">Ainda não há projectos neste workspace.</p>
        ) : null
      ) : (
        <ul className="ws-projects-list">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/workspaces/${workspaceSlug}/projects/${p.id}`}
                className="ws-project-card"
              >
                <span className="ws-project-name">{p.name}</span>
                {p.description ? (
                  <span className="ws-project-desc">{p.description}</span>
                ) : null}
                <span className="ws-project-meta">
                  {p.status}
                  {p.updatedAt ? ` · ${ago(p.updatedAt)}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
