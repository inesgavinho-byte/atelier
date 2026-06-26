import { notFound } from "next/navigation";
import Link from "next/link";
import DecisionItem from "@/components/mission/DecisionItem";
import { SectionHead } from "@/components/mission/bits";
import { decisions, agents as allAgents } from "@/data/mission";
import { getDecision, getInitiativeById } from "@/lib/mission";

export function generateStaticParams() {
  return decisions.map((d) => ({ id: d.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const d = getDecision(params.id);
  return { title: d ? `${d.title} — ATELIER` : "Decisão — ATELIER" };
}

export default function DecisionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const decision = getDecision(params.id);
  if (!decision) notFound();

  const ini = getInitiativeById(decision.initiativeId);
  const agent = allAgents.find((a) => a.id === decision.agentId);

  return (
    <div className="max-w-2xl">
      <Link href="/decisions" className="action-quiet mb-10 inline-block">
        ← Decisões
      </Link>

      <SectionHead>Decisão</SectionHead>
      {/* Reuse the same interactive card; here it is the focus of the page */}
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
          <div key={cell.k} className="border-b border-r border-line bg-cream p-5">
            <div className="eyebrow mb-2">{cell.k}</div>
            <p className="text-[14.5px] leading-relaxed">{cell.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
