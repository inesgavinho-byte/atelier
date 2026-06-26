import { notFound } from "next/navigation";
import Link from "next/link";
import { Meter, StateTag, ago } from "@/components/mission/bits";
import { agents } from "@/data/mission";
import { getAgent, getActivity } from "@/lib/mission";

export function generateStaticParams() {
  return agents.map((a) => ({ id: a.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const a = getAgent(params.id);
  return { title: a ? `${a.role} — ATELIER` : "Agente — ATELIER" };
}

export default function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const agent = getAgent(params.id);
  if (!agent) notFound();

  const events = getActivity().filter((e) => e.agentId === agent.id);

  return (
    <div className="max-w-2xl">
      <Link href="/agents" className="action-quiet mb-10 inline-block">
        ← Agentes
      </Link>

      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-4xl md:text-5xl">{agent.role}</h1>
        <StateTag state={agent.state} />
      </div>
      <p className="meta mt-2">
        {agent.office} · {agent.provider}
      </p>

      <div className="mt-8 border-l-2 border-line-strong pl-4">
        <div className="eyebrow mb-1">Tarefa atual</div>
        <p className="text-[15px] leading-relaxed">{agent.currentTask}</p>
      </div>

      {agent.state === "em execução" ? (
        <div className="mt-6">
          <Meter value={agent.progress} />
          <p className="meta mt-1">{agent.progress}%</p>
        </div>
      ) : null}

      <dl className="mt-8 grid grid-cols-2 gap-px border-l border-t border-line">
        <div className="border-b border-r border-line bg-cream p-5">
          <dt className="eyebrow mb-1">Autonomia</dt>
          <dd className="text-[14px]">Nível {agent.autonomy}</dd>
        </div>
        <div className="border-b border-r border-line bg-cream p-5">
          <dt className="eyebrow mb-1">Último evento</dt>
          <dd className="text-[14px]">{ago(agent.lastEventAt)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="action">Delegar trabalho</button>
        <button type="button" className="action-quiet">Interromper</button>
        <button type="button" className="action-quiet">Alterar prioridade</button>
      </div>

      <div className="mt-12">
        <h2 className="eyebrow mb-5">Histórico</h2>
        {events.length === 0 ? (
          <p className="meta italic">Sem eventos registados.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {events.map((e) => (
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
  );
}
