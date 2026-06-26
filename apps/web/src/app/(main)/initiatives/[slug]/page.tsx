import { notFound } from "next/navigation";
import Link from "next/link";
import DecisionItem from "@/components/mission/DecisionItem";
import {
  Meter,
  ObjectiveDot,
  SectionHead,
  ago,
} from "@/components/mission/bits";
import { initiatives, agents as allAgents } from "@/data/mission";
import {
  getActivityForInitiative,
  getDecisionsForInitiative,
  getInitiative,
  getObjectivesForInitiative,
} from "@/lib/mission";

export function generateStaticParams() {
  return initiatives.map((i) => ({ slug: i.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const i = getInitiative(params.slug);
  return { title: i ? `${i.name} — ATELIER` : "Iniciativa — ATELIER" };
}

export default function InitiativeDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const initiative = getInitiative(params.slug);
  if (!initiative) notFound();

  const objectives = getObjectivesForInitiative(initiative.id);
  const decisions = getDecisionsForInitiative(initiative.id);
  const activity = getActivityForInitiative(initiative.id);

  return (
    <div>
      <Link href="/initiatives" className="action-quiet mb-10 inline-block">
        ← Iniciativas
      </Link>

      <h1 className="font-serif text-4xl md:text-5xl">{initiative.name}</h1>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">
        {initiative.intent}
      </p>
      <div className="mt-6 max-w-md">
        <Meter value={initiative.progress} />
        <p className="meta mt-1">{initiative.progress}% · {initiative.focus}</p>
      </div>

      <div className="mt-14 grid gap-x-12 gap-y-14 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHead>Decisões pendentes</SectionHead>
          {decisions.length === 0 ? (
            <p className="meta italic">Nada requer julgamento aqui.</p>
          ) : (
            <div>
              {decisions.map((d) => {
                const agent = allAgents.find((a) => a.id === d.agentId);
                return (
                  <DecisionItem
                    key={d.id}
                    decision={d}
                    initiativeName={initiative.name}
                    agentRole={agent?.role ?? "—"}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-14">
            <SectionHead>Atividade recente</SectionHead>
            {activity.length === 0 ? (
              <p className="meta italic">Sem atividade.</p>
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
          </div>
        </div>

        <aside className="lg:col-span-1">
          <SectionHead>Objetivos</SectionHead>
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
        </aside>
      </div>
    </div>
  );
}
