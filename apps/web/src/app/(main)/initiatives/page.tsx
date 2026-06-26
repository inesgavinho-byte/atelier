import Link from "next/link";
import { Meter } from "@/components/mission/bits";
import {
  getDecisionsForInitiative,
  getInitiatives,
  getObjectivesForInitiative,
} from "@/lib/mission";

export const metadata = { title: "Iniciativas — ATELIER" };

export default function InitiativesPage() {
  const initiatives = getInitiatives();
  return (
    <div>
      <div className="eyebrow mb-3">Frentes de trabalho</div>
      <h1 className="mb-10 font-serif text-4xl md:text-5xl">Iniciativas</h1>

      <div className="divide-y divide-line border-y border-line">
        {initiatives.map((i) => {
          const objectives = getObjectivesForInitiative(i.id);
          const decisions = getDecisionsForInitiative(i.id);
          return (
            <Link
              key={i.id}
              href={`/initiatives/${i.slug}`}
              className="group block py-8"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="font-serif text-3xl tracking-wide transition-colors group-hover:text-olive">
                  {i.name}
                </h2>
                <span className="meta">{i.progress}%</span>
              </div>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
                {i.intent}
              </p>
              <div className="mt-4 max-w-md">
                <Meter value={i.progress} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-1 meta">
                <span>
                  <span className="text-charcoal">Foco:</span> {i.focus}
                </span>
                <span>{objectives.length} objetivos</span>
                <span>
                  {decisions.length > 0
                    ? `${decisions.length} decisão(ões) pendente(s)`
                    : "Sem decisões pendentes"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
