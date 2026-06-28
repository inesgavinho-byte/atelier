import { notFound } from "next/navigation";
import Link from "next/link";
import DecisionItem from "@/components/mission/DecisionItem";
import {
  NewProjectForm,
  NewSessionForm,
  WorkspaceAdmin,
} from "@/components/workspaces/WorkspaceForms";
import {
  Meter,
  ObjectiveDot,
  SectionHead,
  StateTag,
  ago,
} from "@/components/mission/bits";
import {
  getAgents,
  getAgentsForInitiative,
  getArtifactsForInitiative,
  getDecisionsForInitiative,
  getInitiativeByIdOrSlug,
  getObjectivesForInitiative,
} from "@/lib/mission";
import { getChats, getProjects } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ws = await getInitiativeByIdOrSlug(params.workspaceId);
  if (!ws) notFound();

  const [
    projects,
    chats,
    objectives,
    decisions,
    artifacts,
    agents,
    allAgents,
  ] = await Promise.all([
    getProjects(ws.id),
    getChats(ws.id),
    getObjectivesForInitiative(ws.id),
    getDecisionsForInitiative(ws.id),
    getArtifactsForInitiative(ws.id),
    getAgentsForInitiative(ws.id),
    getAgents(),
  ]);
  const recentChats = chats.slice(0, 6);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const agentById = new Map(allAgents.map((a) => [a.id, a]));

  return (
    <div>
      <Link href="/workspaces" className="action-quiet mb-10 inline-block">
        ← Workspaces
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl">{ws.name}</h1>
          {ws.intent ? (
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">
              {ws.intent}
            </p>
          ) : null}
          <div className="mt-6 max-w-md">
            <Meter value={ws.progress} />
            <p className="meta mt-1">
              {ws.progress}%{ws.focus ? ` · ${ws.focus}` : ""}
            </p>
          </div>
        </div>
        <WorkspaceAdmin
          workspaceId={ws.id}
          currentName={ws.name}
          archived={false}
        />
      </div>

      {/* Objectives + Pending decisions + Artifacts + Agents */}
      <div className="mt-14 grid gap-x-12 gap-y-14 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHead>Decisões pendentes</SectionHead>
          {decisions.length === 0 ? (
            <p className="meta italic">Nada requer julgamento aqui.</p>
          ) : (
            <div>
              {decisions.map((d) => {
                const agent = agentById.get(d.agentId);
                return (
                  <DecisionItem
                    key={d.id}
                    decision={d}
                    initiativeName={ws.name}
                    agentRole={agent?.role ?? "—"}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-14">
            <SectionHead aside={`${artifacts.length}`}>Artefactos</SectionHead>
            {artifacts.length === 0 ? (
              <p className="meta italic">Sem artefactos.</p>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {artifacts.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
                  >
                    <div className="min-w-0">
                      <span className="text-[14px] text-charcoal">
                        {a.title}
                      </span>
                      <span className="meta ml-2">{a.kind}</span>
                    </div>
                    <span className="meta shrink-0">{a.state}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="lg:col-span-1">
          <SectionHead>Objetivos</SectionHead>
          {objectives.length === 0 ? (
            <p className="meta italic">Sem objetivos definidos.</p>
          ) : (
            <ul className="space-y-5">
              {objectives.map((o) => (
                <li key={o.id}>
                  <div className="flex items-baseline gap-2">
                    <ObjectiveDot status={o.status} />
                    <span className="text-[14px] text-charcoal">{o.title}</span>
                  </div>
                  <div className="mt-2 pl-3.5">
                    <Meter value={o.progress} />
                    {o.risk ? <p className="meta mt-1">{o.risk}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-12">
            <SectionHead>Agentes</SectionHead>
            {agents.length === 0 ? (
              <p className="meta italic">Sem agentes atribuídos.</p>
            ) : (
              <ul className="space-y-4">
                {agents.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/agents/${a.id}`}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="text-[14px] text-charcoal transition-colors hover:text-olive">
                        {a.role}
                      </span>
                      <StateTag state={a.state} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Projects + Chats */}
      <div className="mt-20 grid gap-x-12 gap-y-14 lg:grid-cols-2">
        {/* Projects */}
        <section>
          <h2 className="eyebrow mb-5">Projetos</h2>
          {projects.length === 0 ? (
            <p className="meta italic mb-6">Ainda não há projetos.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line mb-6">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/workspaces/${ws.id}/projects/${p.id}`}
                    className="group flex items-baseline justify-between gap-4 py-3"
                  >
                    <span className="text-[15px] text-charcoal transition-colors group-hover:text-olive">
                      {p.name}
                    </span>
                    {p.status !== "Ativo" ? (
                      <span className="meta shrink-0">{p.status}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="panel p-5">
            <p className="eyebrow mb-3">Novo projeto</p>
            <NewProjectForm workspaceId={ws.id} />
          </div>
        </section>

        {/* Recent chats + new chat */}
        <section>
          <h2 className="eyebrow mb-5">Chats recentes</h2>
          {recentChats.length === 0 ? (
            <p className="meta italic mb-6">Ainda não há chats.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line mb-6">
              {recentChats.map((c) => {
                const base = c.projectId
                  ? `/workspaces/${ws.id}/projects/${c.projectId}`
                  : `/workspaces/${ws.id}`;
                return (
                  <li key={c.id}>
                    <Link
                      href={`${base}/chats/${c.id}`}
                      className="group flex items-baseline justify-between gap-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] text-charcoal transition-colors group-hover:text-olive">
                          {c.title}
                        </span>
                        <span className="meta">
                          {c.provider ?? "ATELIER"}
                          {c.projectId
                            ? ` · ${projectName.get(c.projectId) ?? "projeto"}`
                            : ""}
                        </span>
                      </span>
                      <span className="meta shrink-0">{ago(c.updatedAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="panel p-5">
            <p className="eyebrow mb-3">Nova sessão de IA</p>
            <NewSessionForm workspaceId={ws.id} />
          </div>
        </section>
      </div>
    </div>
  );
}
