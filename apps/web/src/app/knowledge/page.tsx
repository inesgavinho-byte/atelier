import KnowledgeIndex, {
  type KnowledgeItem,
} from "@/components/knowledge/KnowledgeIndex";
import {
  CATEGORY_LABELS,
  getKnowledgeRegistry,
  type KnowledgeCategory,
} from "@/lib/knowledge-docs";

/**
 * The Knowledge Library index. Documents are grouped by layer — Principles,
 * Mental Models and Skills — and read directly from the markdown source. A
 * simple client-side search sits on top.
 */
export default function KnowledgeIndexPage() {
  const registry = getKnowledgeRegistry();
  const categories: KnowledgeCategory[] = [
    "principles",
    "mental-models",
    "skills",
  ];

  const sections = categories.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: registry
      .filter((e) => e.category === category)
      .map<KnowledgeItem>((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        categoryLabel: CATEGORY_LABELS[category],
        version: e.meta.version,
        status: e.meta.status,
        source: e.meta.source ?? [],
        href: `/knowledge/${e.category}/${e.id}`,
      })),
  }));

  return (
    <div>
      <p className="eyebrow mb-3">Biblioteca interna</p>
      <h1 className="font-serif text-5xl leading-tight">Knowledge</h1>
      <p className="mt-5 text-[16px] leading-relaxed text-muted">
        A biblioteca de pensamento do ATELIER — Princípios, Modelos Mentais e
        Skills, lidos directamente da fonte. Os ficheiros markdown permanecem a
        única fonte de verdade.
      </p>

      <div className="mt-16">
        <KnowledgeIndex sections={sections} />
      </div>
    </div>
  );
}
