import Link from "next/link";
import DecisionItem from "@/components/mission/DecisionItem";
import {
  Meter,
  ObjectiveDot,
  SectionHead,
  ago,
} from "@/components/mission/bits";
import {
  getActivity,
  getAgents,
  getInitiatives,
  getNextAction,
  getObjectivesAtRisk,
  getPendingDecisions,
  getTodaySummary,
} from "@/lib/mission";
import { todayLabel } from "@/data/mission";

export const dynamic = "force-dynamic";

/**
 * Mission Control — the supervision view.
 *
 * Where the desk (/) is for resuming work, this is for inspecting the whole
 * system: pending judgement, objectives at risk, agents in flight, and recent
 * activity. Metrics live here, deliberately, not on the desk.
 */
export default async function MissionControlPage() {
  const [summary, decisions, agents, atRisk, initiatives, activityAll] =
    await Promise.all([
      getTodaySummary(),
      getPendingDecisions(),
      getAgents(),
      getObjectivesAtRisk(),
      getInitiatives(),
      getActivity(),
    ]);
  const next = getNextAction();
  const running = agents.filter((a) => a.state === "em execução");
  const activity = activityAll.slice(0, 6);
  const iniById = new Map(initiatives.map((i) => [i.id, i]));
  const agentById = new Map(agents.map((a) => [a.id, a]));

  const stats: { v: string | number; label: string; href?: string }[] = [
    { v: summary.decisions, label: "decisões pendentes", href: "/decisions" },
    { v: summary.agentsActive, label: "agentes ativos", href: "/agents" },
    { v: summary.initiatives, label: "iniciativas", href: "/initiatives" },
    {
      v: summary.publications,
      label: "publicação pronta",
      href: `/decisions/${next.decisionId}`,
    },
    { v: summary.sync, label: "sincronização" },
  ];

  return (
    <div>
      {/* Supervision header */}
      <section className="mb-12">
        <div className="eyebrow mb-3">{todayLabel}</div>
        <h1 className="font-serif text-4xl md:text-5xl">Mission Control</h1>
        <p className="meta mt-3 max-w-2xl">
          Vista de supervisão — o estado do sistema num relance.
        </p>
        <dl className="mt-8 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) =>
            s.href ? (
              <Link
                key={s.label}
                href={s.href}
                className="group border-b border-r border-line bg-cream px-5 py-5 transition-colors hover:bg-surface"
              >
                <dd className="font-serif text-4xl text-charcoal">{s.v}</dd>
                <dt className="meta mt-1 group-hover:text-charcoal">
                  {s.label}
                </dt>
              </Link>
            ) : (
              <div
                key={s.label}
                className="border-b border-r border-line bg-cream px-5 py-5"
              >
                <dd className="font-serif text-4xl text-charcoal">{s.v}</dd>
                <dt className="meta mt-1">{s.label}</dt>
              </div>
            )
          )}
        </dl>
      </section>

      {/* Próxima ação — surfaced high: it orients the whole day */}
      <section className="mb-16 border-l-2 border-charcoal pl-5">
        <div className="eyebrow mb-2">Próxima ação</div>
        <p className="max-w-2xl font-serif text-2xl leading-snug text-charcoal">
          {next.label}
        </p>
        <p className="meta mt-2 max-w-2xl">{next.rationale}</p>
        <Link href={`/decisions/${next.decisionId}`} className="action mt-5">
          Continuar
        </Link>
      </section>

      {/* Decisões (primary) with a risk / running rail */}
      <div className="grid gap-x-12 gap-y-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHead
            aside={
              <Link href="/decisions" className="hover:text-charcoal">
                Todas →
              </Link>
            }
          >
            Requer decisão
          </SectionHead>
          {decisions.length === 0 ? (
            <p className="meta italic">Nada requer julgamento agora.</p>
          ) : (
            <div>
              {decisions.map((d) => {
                const ini = iniById.get(d.initiativeId);
                const agent = agentById.get(d.agentId);
                return (
                  <DecisionItem
                    key={d.id}
                    decision={d}
                    initiativeName={ini?.name ?? "—"}
                    initiativeSlug={ini?.slug}
                    agentRole={agent?.role ?? "—"}
                  />
                );
              })}
            </div>
          )}
        </div>

        <aside className="lg:col-span-1">
          {/* Objetivos em risco */}
          <div id="risco" className="mb-12 scroll-mt-24">
            <SectionHead>Objetivos em risco</SectionHead>
            {atRisk.length === 0 ? (
              <p className="meta italic">Nenhum objetivo em risco.</p>
            ) : (
              <ul className="space-y-5">
                {atRisk.map((o) => {
                  const ini = iniById.get(o.initiativeId);
                  return (
                    <li key={o.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-[14px] text-charcoal">
                          <ObjectiveDot status={o.status} />
                          {o.title}
                        </span>
                        <span className="meta shrink-0">{ini?.name}</span>
                      </div>
                      {o.risk ? (
                        <p className="meta mt-1 pl-3.5">{o.risk}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Em execução */}
          <div>
            <SectionHead
              aside={
                <Link href="/agents" className="hover:text-charcoal">
                  Equipa →
                </Link>
              }
            >
              Em execução
            </SectionHead>
            {running.length === 0 ? (
              <p className="meta italic">Nenhum agente em execução.</p>
            ) : (
              <ul className="space-y-5">
                {running.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/agents/${a.id}`}
                      className="text-[14px] text-charcoal transition-colors hover:text-olive"
                    >
                      {a.role}
                    </Link>
                    <p className="meta mb-2 mt-0.5 line-clamp-1">
                      {a.currentTask}
                    </p>
                    <Meter value={a.progress} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Iniciativas ativas */}
      <section className="mt-20">
        <SectionHead
          aside={
            <Link href="/initiatives" className="hover:text-charcoal">
              Todas →
            </Link>
          }
        >
          Iniciativas ativas
        </SectionHead>
        {initiatives.length === 0 ? (
          <p className="meta italic">Ainda não há iniciativas.</p>
        ) : (
          <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {initiatives.map((i) => (
              <Link
                key={i.id}
                href={`/initiatives/${i.slug}`}
                className="group border-b border-r border-line bg-cream p-6 transition-colors hover:bg-surface"
              >
                <div className="font-serif text-2xl tracking-wide">
                  {i.name}
                </div>
                <p className="meta mb-5 mt-2 line-clamp-2">{i.focus}</p>
                <Meter value={i.progress} />
                <p className="meta mt-1">{i.progress}%</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Atividade */}
      <section className="mt-20">
        <SectionHead
          aside={
            <Link href="/activity" className="hover:text-charcoal">
              Tudo →
            </Link>
          }
        >
          Atividade
        </SectionHead>
        {activity.length === 0 ? (
          <p className="meta italic">Sem atividade recente.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {activity.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline justify-between gap-6 py-3"
              >
                <span className="text-[14px]">{e.title}</span>
                <span className="meta shrink-0">{ago(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
