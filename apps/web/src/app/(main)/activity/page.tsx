import Timeline, { type TimelineItem } from "@/components/mission/Timeline";
import { getActivity, getInitiativeById } from "@/lib/mission";

export const metadata = { title: "Atividade — ATELIER" };

const KIND_LABEL: Record<string, string> = {
  decisão: "Decisão",
  publicação: "Publicação",
  produção: "Produção",
  investigação: "Investigação",
  memória: "Memória",
  agente: "Agente",
};

export default function ActivityPage() {
  const items: TimelineItem[] = getActivity().map((e) => {
    const ini = e.initiativeId ? getInitiativeById(e.initiativeId) : undefined;
    return {
      id: e.id,
      kindLabel: KIND_LABEL[e.kind] ?? "Evento",
      title: e.title,
      at: e.at,
      initiativeName: ini?.name,
      initiativeSlug: ini?.slug,
    };
  });

  return (
    <div>
      <div className="eyebrow mb-3">Registo operacional</div>
      <h1 className="mb-10 font-serif text-4xl md:text-5xl">Atividade</h1>
      <Timeline items={items} />
    </div>
  );
}
