import Link from "next/link";
import { ago } from "@/components/mission/bits";
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
  const events = getActivity();
  return (
    <div>
      <div className="eyebrow mb-3">Registo operacional</div>
      <h1 className="mb-10 font-serif text-4xl md:text-5xl">Atividade</h1>

      <ul className="divide-y divide-line border-t border-line">
        {events.map((e) => {
          const ini = e.initiativeId
            ? getInitiativeById(e.initiativeId)
            : undefined;
          return (
            <li
              key={e.id}
              className="grid gap-2 py-5 sm:grid-cols-[140px_1fr]"
            >
              <div className="meta">
                <div className="eyebrow">{KIND_LABEL[e.kind] ?? "Evento"}</div>
                <div className="mt-1">{ago(e.at)}</div>
              </div>
              <div>
                <p className="text-[15px] text-charcoal">{e.title}</p>
                {ini ? (
                  <Link
                    href={`/initiatives/${ini.slug}`}
                    className="meta mt-1 inline-block hover:text-charcoal"
                  >
                    {ini.name}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
