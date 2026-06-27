"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/** Serialisable shape passed from the server index page. */
export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  version?: string;
  status?: string;
  source: string[];
  href: string;
}

interface Section {
  category: string;
  label: string;
  items: KnowledgeItem[];
}

/**
 * Knowledge Library index with simple client-side search.
 *
 * Search is a plain substring match across title, id, category and source —
 * no semantic search. Sections collapse when a query filters out all their
 * documents.
 */
export default function KnowledgeIndex({ sections }: { sections: Section[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const haystack = [
            item.title,
            item.id,
            item.category,
            item.categoryLabel,
            ...item.source,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [query, sections]);

  const total = filtered.reduce((n, s) => n + s.items.length, 0);

  return (
    <div>
      <div className="mb-12">
        <label htmlFor="knowledge-search" className="sr-only">
          Pesquisar conhecimento
        </label>
        <input
          id="knowledge-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por título, id, categoria ou fonte…"
          className="w-full border-b border-line bg-transparent pb-2 text-[16px] text-charcoal placeholder:text-muted/70 focus:border-charcoal focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="meta italic">Nenhum documento corresponde a “{query}”.</p>
      ) : (
        <div className="space-y-12">
          {filtered.map((section) => (
            <section key={section.category}>
              <h2 className="eyebrow mb-5">{section.label}</h2>
              <ul className="divide-y divide-line border-y border-line">
                {section.items.map((item) => (
                  <li key={`${item.category}/${item.id}`}>
                    <Link
                      href={item.href}
                      className="group flex items-baseline justify-between gap-4 py-4 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-serif text-2xl transition-colors group-hover:text-olive">
                          {item.title}
                        </span>
                        {item.source.length ? (
                          <span className="meta mt-1 block truncate">
                            {item.source.join(" · ")}
                          </span>
                        ) : null}
                      </span>
                      <span className="meta shrink-0">{item.id}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {query.trim() ? (
        <p className="meta mt-10">
          {total} {total === 1 ? "resultado" : "resultados"}
        </p>
      ) : null}
    </div>
  );
}
