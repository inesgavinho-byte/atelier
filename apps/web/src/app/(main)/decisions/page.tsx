import DecisionItem from "@/components/mission/DecisionItem";
import { SectionHead } from "@/components/mission/bits";
import {
  getInitiativeById,
  getPendingDecisions,
} from "@/lib/mission";
import { agents as allAgents } from "@/data/mission";

export const metadata = { title: "Decisões — ATELIER" };

export default function DecisionsPage() {
  const decisions = getPendingDecisions();
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
            const ini = getInitiativeById(d.initiativeId);
            const agent = allAgents.find((a) => a.id === d.agentId);
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
