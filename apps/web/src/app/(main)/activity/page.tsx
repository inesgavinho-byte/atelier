import Timeline, { type TimelineItem } from "@/components/mission/Timeline";
import { getActivity, getInitiatives } from "@/lib/mission";

export const dynamic = "force-dynamic";
export const metadata = { title: "Atividade — ATELIER" };

const KIND_LABEL: Record<string, string> = {
  decisão: "Decisão",
  publicação: "Publicação",
  produção: "Produção",
  investigação: "Investigação",
  memória: "Memória",
  agente: "Agente",
};

export default async function ActivityPage() {
  const [events, initiatives] = await Promise.all([
    getActivity(),
    getInitiatives(),
  ]);
  const iniById = new Map(initiatives.map((i) => [i.id, i]));
  const items: TimelineItem[] = events.map((e) => {
    const ini = e.workspaceId ? iniById.get(e.workspaceId) : undefined;
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
