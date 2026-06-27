import { notFound } from "next/navigation";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import {
  getProductDocs,
  getProductNeighbours,
  loadProductDoc,
} from "@/lib/product-docs";

export function generateStaticParams() {
  return getProductDocs().map((d) => ({ id: d.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const doc = loadProductDoc(params.id);
  return {
    title: doc?.meta.title
      ? `${doc.meta.title} — ATELIER`
      : "Produto — ATELIER",
  };
}

export default function ProductDocViewerPage({
  params,
}: {
  params: { id: string };
}) {
  const doc = loadProductDoc(params.id);
  if (!doc) notFound();

  const { entry, meta, body } = doc;
  const { prev, next } = getProductNeighbours(entry.id);

  return (
    <article>
      <Link href="/product" className="action-quiet mb-10 inline-block">
        ← Produto
      </Link>

      {/* Quiet metadata header — sourced from the document frontmatter */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 meta">
        <span>{meta.id ?? entry.id}</span>
        <span aria-hidden>·</span>
        <span>{entry.kind}</span>
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
        {meta.updated ? (
          <>
            <span aria-hidden>·</span>
            <span>actualizado {meta.updated}</span>
          </>
        ) : null}
      </div>

      {/* Document body — markdown file is the single source of truth */}
      <Markdown content={body} />

      {/* Previous / next */}
      <nav className="mt-20 flex items-center justify-between gap-4 border-t border-line pt-8">
        <div className="min-w-0">
          {prev ? (
            <Link href={`/product/${prev.id}`} className="action-quiet">
              ← {prev.label}
            </Link>
          ) : (
            <span className="meta italic">Início</span>
          )}
        </div>
        <div className="min-w-0 text-right">
          {next ? (
            <Link href={`/product/${next.id}`} className="action-quiet">
              {next.label} →
            </Link>
          ) : (
            <span className="meta italic">Fim</span>
          )}
        </div>
      </nav>
    </article>
  );
}
