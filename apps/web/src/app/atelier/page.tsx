import Link from "next/link";
import { getDocs } from "@/lib/atelier-docs";

/**
 * The constitutional library index. Documents are grouped by section.
 * Only one document exists for now.
 */
export default function AtelierIndexPage() {
  const docs = getDocs();
  const sections = Array.from(new Set(docs.map((d) => d.section)));

  return (
    <div>
      <p className="eyebrow mb-3">Biblioteca interna</p>
      <h1 className="font-serif text-5xl leading-tight">Constituição</h1>
      <p className="mt-5 text-[16px] leading-relaxed text-muted">
        A biblioteca constitucional do ATELIER. Documentos fundadores, lidos
        directamente da fonte.
      </p>

      <div className="mt-16 space-y-12">
        {sections.map((section) => (
          <section key={section}>
            <h2 className="eyebrow mb-5">{section}</h2>
            <ul className="divide-y divide-line border-y border-line">
              {docs
                .filter((d) => d.section === section)
                .map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/atelier/${d.id}`}
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
          </section>
        ))}
      </div>
    </div>
  );
}
