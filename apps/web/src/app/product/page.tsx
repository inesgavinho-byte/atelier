import Link from "next/link";
import {
  PRODUCT_KINDS,
  PRODUCT_KIND_LABELS,
  getProductDocsByKind,
} from "@/lib/product-docs";

/**
 * The product backlog library index, grouped by level
 * (Epics, Features, Stories, Tasks).
 */
export default function ProductIndexPage() {
  return (
    <div>
      <p className="eyebrow mb-3">Biblioteca interna</p>
      <h1 className="font-serif text-5xl leading-tight">Produto</h1>
      <p className="mt-5 text-[16px] leading-relaxed text-muted">
        O backlog de implementação do ATELIER. Separado da Constituição, lido
        directamente da fonte.
      </p>

      <div className="mt-16 space-y-12">
        {PRODUCT_KINDS.map((kind) => {
          const docs = getProductDocsByKind(kind);
          return (
            <section key={kind}>
              <h2 className="eyebrow mb-5">{PRODUCT_KIND_LABELS[kind]}</h2>
              {docs.length === 0 ? (
                <p className="meta italic border-y border-line py-4">
                  Ainda sem documentos.
                </p>
              ) : (
                <ul className="divide-y divide-line border-y border-line">
                  {docs.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/product/${d.id}`}
                        className="group flex items-baseline justify-between gap-4 py-4 transition-colors"
                      >
                        <span className="font-serif text-2xl transition-colors group-hover:text-olive">
                          {d.label}
                        </span>
                        <span className="meta shrink-0">{d.id}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
