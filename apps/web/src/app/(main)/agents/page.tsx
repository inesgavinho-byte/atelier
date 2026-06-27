import AgentItem from "@/components/mission/AgentItem";
import { SectionHead } from "@/components/mission/bits";
import { getAgents } from "@/lib/mission";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agentes — ATELIER" };

export default async function AgentsPage() {
  const agents = await getAgents();
  const running = agents.filter((a) => a.state === "em execução");
  const other = agents.filter((a) => a.state !== "em execução");

  return (
    <div>
      <div className="eyebrow mb-3">Capacidade operacional</div>
      <h1 className="mb-10 font-serif text-4xl md:text-5xl">Agentes</h1>

      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <div>
          <SectionHead aside={`${running.length}`}>Em execução</SectionHead>
          <div>
            {running.map((a) => (
              <AgentItem key={a.id} agent={a} />
            ))}
          </div>
        </div>
        <div>
          <SectionHead>Restantes</SectionHead>
          <div>
            {other.map((a) => (
              <AgentItem key={a.id} agent={a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
