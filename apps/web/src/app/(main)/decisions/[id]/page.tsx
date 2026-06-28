import { notFound } from "next/navigation";
import Link from "next/link";
import DecisionItem from "@/components/mission/DecisionItem";
import { SectionHead } from "@/components/mission/bits";
import { getAgent, getDecision, getInitiativeById } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const d = await getDecision(params.id);
  return { title: d ? `${d.title} — ATELIER` : "Decisão — ATELIER" };
}

export default async function DecisionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const decision = await getDecision(params.id);
  if (!decision) notFound();

  const [ini, agent] = await Promise.all([
    getInitiativeById(decision.workspaceId),
    getAgent(decision.agentId),
  ]);

  return (
    <div className="max-w-2xl">
      <Link href="/decisions" className="action-quiet mb-10 inline-block">
        ← Decisões
      </Link>

      <SectionHead>Decisão</SectionHead>
      <DecisionItem
        decision={decision}
        initiativeName={ini?.name ?? "—"}
        initiativeSlug={ini?.slug}
        agentRole={agent?.role ?? "—"}
      />

      <div className="mt-10 grid grid-cols-2 gap-px border-l border-t border-line">
        {[
          { k: "Contexto", v: decision.context },
          { k: "Impacto", v: decision.impact },
        ].map((cell) => (
          <div
            key={cell.k}
            className="border-b border-r border-line bg-cream p-5"
          >
            <div className="eyebrow mb-2">{cell.k}</div>
            <p className="text-[14.5px] leading-relaxed">{cell.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
