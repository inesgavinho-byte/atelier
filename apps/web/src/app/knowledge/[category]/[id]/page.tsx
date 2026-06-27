import { notFound } from "next/navigation";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import {
  CATEGORY_LABELS,
  getKnowledgeRegistry,
  type KnowledgeCategory,
  type RelatedLink,
  loadKnowledge,
  relationshipsFor,
} from "@/lib/knowledge-docs";

const CATEGORIES: KnowledgeCategory[] = [
  "principles",
  "mental-models",
  "skills",
];

function isCategory(value: string): value is KnowledgeCategory {
  return (CATEGORIES as string[]).includes(value);
}

export function generateStaticParams() {
  return getKnowledgeRegistry().map((e) => ({
    category: e.category,
    id: e.id,
  }));
}

export function generateMetadata({
  params,
}: {
  params: { category: string; id: string };
}) {
  if (!isCategory(params.category)) return { title: "Knowledge — ATELIER" };
  const doc = loadKnowledge(params.category, params.id);
  return {
    title: doc?.meta.title
      ? `${doc.meta.title} — ATELIER`
      : "Knowledge — ATELIER",
  };
}

/** A clickable chip row for a relationship group. */
function RelationGroup({
  label,
  links,
}: {
  label: string;
  links: RelatedLink[];
}) {
  if (!links.length) return null;
  return (
    <div className="mt-5 first:mt-0">
      <h3 className="eyebrow mb-3">{label}</h3>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.id}>
            {link.href ? (
              <Link
                href={link.href}
                className="inline-block border border-line px-3 py-1.5 text-[13px] text-charcoal transition-colors hover:border-charcoal hover:text-olive"
                title={link.title}
              >
                {link.id}
              </Link>
            ) : (
              <span
                className="inline-block border border-line px-3 py-1.5 text-[13px] text-muted"
                title={link.title}
              >
                {link.id}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function KnowledgeViewerPage({
  params,
}: {
  params: { category: string; id: string };
}) {
  if (!isCategory(params.category)) notFound();
  const doc = loadKnowledge(params.category, params.id);
  if (!doc) notFound();

  const { entry, meta, body } = doc;
  const rel = relationshipsFor(entry);
  const hasRelationships =
    rel.principles.length || rel.mentalModels.length || rel.refs.length;

  return (
    <article>
      <Link href="/knowledge" className="action-quiet mb-10 inline-block">
        ← Knowledge
      </Link>

      {/* Quiet metadata header — sourced from the document frontmatter */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 meta">
        <span>{meta.id ?? entry.id}</span>
        <span aria-hidden>·</span>
        <span>{CATEGORY_LABELS[entry.category]}</span>
        {meta.version ? (
          <>
            <span aria-hidden>·</span>
            <span>{meta.version}</span>
          </>
        ) : null}
        {meta.status ? (
          <>
            <span aria-hidden>·</span>
            <span>{meta.status}</span>
          </>
        ) : null}
        {meta.source?.length ? (
          <>
            <span aria-hidden>·</span>
            <span>{meta.source.join(", ")}</span>
          </>
        ) : null}
      </div>

      {/* Document body — markdown file is the single source of truth */}
      <Markdown content={body} />

      {/* Declared relationships, resolved to clickable links */}
      {hasRelationships ? (
        <section className="mt-16 border-t border-line pt-8">
          <p className="eyebrow mb-5">Relações</p>
          <RelationGroup label="Princípios" links={rel.principles} />
          <RelationGroup label="Modelos Mentais" links={rel.mentalModels} />
          <RelationGroup label="Referências" links={rel.refs} />
        </section>
      ) : null}
    </article>
  );
}
