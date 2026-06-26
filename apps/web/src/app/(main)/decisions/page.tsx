import DecisionItem from "@/components/mission/DecisionItem";
import { SectionHead } from "@/components/mission/bits";
import { getAgents, getInitiatives, getPendingDecisions } from "@/lib/mission";

export const dynamic = "force-dynamic";
export const metadata = { title: "Decisões — ATELIER" };

export default async function DecisionsPage() {
  const [decisions, initiatives, agents] = await Promise.all([
    getPendingDecisions(),
    getInitiatives(),
    getAgents(),
  ]);
  const iniById = new Map(initiatives.map((i) => [i.id, i]));
  const agentById = new Map(agents.map((a) => [a.id, a]));

  return (
    <div>
      <div className="eyebrow mb-3">Julgamento</div>
      <h1 className="mb-10 font-serif text-4xl md:text-5xl">Decisões</h1>

      <SectionHead aside={`${decisions.length} pendentes`}>
        Por ordem de prioridade
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
  );
}
