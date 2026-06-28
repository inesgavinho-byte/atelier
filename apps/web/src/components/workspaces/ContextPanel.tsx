import { StateTag, ago } from "@/components/mission/bits";
import RepoPanel from "@/components/workspaces/RepoPanel";
import type { WorkspaceContext } from "@/lib/workspaces";
import type { Agent, Artifact, Decision } from "@/data/mission";

/**
 * ContextPanel — the workspace's right rail (ADR-0004).
 *
 * Surfaces the compressed workspace memory, decisions, artifacts, lessons and
 * assigned agents alongside the continuous chat. A server component: it only
 * reads data passed from the page. Each section degrades to a calm empty state.
 */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="ctx-section-title">{children}</h2>;
}

function decisionDotClass(status: string): string {
  if (status === "pendente") return "ctx-dot-amber";
  if (status === "aprovada") return "ctx-dot-green";
  return "ctx-dot-neutral";
}

export default function ContextPanel({
  workspaceId,
  githubRepo,
  context,
  decisions,
  artifacts,
  agents,
}: {
  workspaceId: string;
  githubRepo?: string;
  context: WorkspaceContext | null;
  decisions: Decision[];
  artifacts: Artifact[];
  agents: Agent[];
}) {
  const summary = context?.summary?.trim() ?? "";
  const lessons = (context?.lessons ?? []).filter(
    (l): l is string => typeof l === "string" && l.trim().length > 0
  );

  return (
    <aside className="ctx-panel">
      {/* 1. Workspace context */}
      <section className="ctx-section">
        <SectionTitle>Contexto do workspace</SectionTitle>
        {summary ? (
          <>
            <p className="ctx-summary">{summary}</p>
            {context ? (
              <p className="ctx-meta">
                v{context.version}
                {context.lastUpdatedAt
                  ? ` · ${ago(context.lastUpdatedAt)}`
                  : ""}
              </p>
            ) : null}
          </>
        ) : (
          <p className="ctx-empty">Sem memória ainda.</p>
        )}
      </section>

      {/* 2. Repository (GitHub per workspace) */}
      <RepoPanel workspaceId={workspaceId} initialRepo={githubRepo} />

      {/* 3. Decisions */}
      <section className="ctx-section">
        <SectionTitle>Decisões</SectionTitle>
        {decisions.length === 0 ? (
          <p className="ctx-empty">Nada a decidir.</p>
        ) : (
          <ul className="ctx-list">
            {decisions.map((d) => (
              <li key={d.id} className="ctx-row">
                <span className={`ctx-dot ${decisionDotClass(d.status)}`} />
                <span className="ctx-row-text">{d.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. Artifacts */}
      <section className="ctx-section">
        <SectionTitle>Artefactos</SectionTitle>
        {artifacts.length === 0 ? (
          <p className="ctx-empty">Sem artefactos.</p>
        ) : (
          <ul className="ctx-list">
            {artifacts.map((a) => (
              <li key={a.id} className="ctx-row">
                <span className="ctx-dot ctx-dot-violet" />
                <span className="ctx-row-text">{a.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Lessons learned */}
      <section className="ctx-section">
        <SectionTitle>Lições aprendidas</SectionTitle>
        {lessons.length === 0 ? (
          <p className="ctx-empty">Sem lições registadas.</p>
        ) : (
          <ul className="ctx-bullets">
            {lessons.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. Agents */}
      <section className="ctx-section">
        <SectionTitle>Agentes</SectionTitle>
        {agents.length === 0 ? (
          <p className="ctx-empty">Sem agentes atribuídos.</p>
        ) : (
          <ul className="ctx-list">
            {agents.map((a) => (
              <li key={a.id} className="ctx-agent">
                <span className="ctx-row-text">{a.role}</span>
                <StateTag state={a.state} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
