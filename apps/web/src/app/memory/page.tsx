import { PageHeader, Section, Empty } from "@/components/ui";
import { memory } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { MemoryKind } from "@/data/types";

export const metadata = { title: "Memory — ATELIER" };

const ENTRY_SECTIONS: { kind: MemoryKind; title: string }[] = [
  { kind: "thinking", title: "Recent thinking" },
  { kind: "canon", title: "Canon" },
  { kind: "reference", title: "References" },
  { kind: "conversation", title: "Conversations" },
  { kind: "artifact", title: "Artifacts" },
];

export default function MemoryPage() {
  const { ideas, principles, decisions, entries } = memory;

  return (
    <div>
      <PageHeader
        eyebrow="Knowledge base"
        title="Memory"
        lead="A structured record of the thinking — ideas, principles, decisions and the work that carries them. Not a file dump."
      />

      {/* Ideas */}
      <Section title="Ideas">
        <ul className="flex flex-wrap gap-2">
          {ideas.map((idea) => (
            <li
              key={idea.id}
              className="border border-line px-3 py-1.5 text-[13.5px] text-charcoal transition-colors hover:border-line-strong"
            >
              {idea.label}
            </li>
          ))}
        </ul>
      </Section>

      {/* Principles */}
      <Section title="Principles">
        <ul className="divide-y divide-line border-y border-line">
          {principles.map((p) => (
            <li key={p.id} className="py-4">
              <div className="font-serif text-xl">{p.label}</div>
              {p.note ? <p className="meta mt-1">{p.note}</p> : null}
            </li>
          ))}
        </ul>
      </Section>

      {/* Decisions */}
      <Section title="Decisions">
        <ul className="space-y-3">
          {decisions.map((d) => (
            <li key={d.id} className="flex items-baseline gap-4">
              <span className="dot bg-charcoal mt-2 shrink-0" aria-hidden />
              <span className="text-[15px] leading-relaxed">{d.statement}</span>
              <span className="meta ml-auto shrink-0">{formatDate(d.date)}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Entry-backed sections */}
      {ENTRY_SECTIONS.map(({ kind, title }) => {
        const items = entries.filter((e) => e.kind === kind);
        return (
          <Section key={kind} title={title}>
            {items.length === 0 ? (
              <Empty>Nothing recorded yet.</Empty>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {items.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
                  >
                    <div className="min-w-0">
                      <div className="text-[15px] text-charcoal">{e.title}</div>
                      <p className="meta">{e.excerpt}</p>
                    </div>
                    <span className="meta shrink-0">{formatDate(e.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        );
      })}
    </div>
  );
}
