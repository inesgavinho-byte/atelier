"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/lib/mission";

/**
 * Global search overlay. Searches across initiatives, decisions, agents,
 * objectives and constitutional documents (EPIC-001 §Pesquisa). Opens over the
 * surface so the user never leaves their place.
 */
export default function CommandSearch({
  corpus,
  onClose,
}: {
  corpus: SearchResult[];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pool = term
      ? corpus.filter(
          (r) =>
            r.label.toLowerCase().includes(term) ||
            r.detail.toLowerCase().includes(term) ||
            r.group.toLowerCase().includes(term)
        )
      : corpus;
    const groups: Record<string, SearchResult[]> = {};
    for (const r of pool) (groups[r.group] ??= []).push(r);
    return groups;
  }, [q, corpus]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-charcoal/20 px-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl border border-line-strong bg-cream"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-4">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar iniciativas, decisões, agentes, memória…"
            className="w-full bg-transparent font-serif text-xl text-charcoal outline-none placeholder:text-beige"
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto px-5 py-2">
          {Object.keys(results).length === 0 ? (
            <p className="meta py-8 text-center italic">Sem resultados.</p>
          ) : (
            Object.entries(results).map(([group, items]) => (
              <div key={group} className="py-3">
                <div className="eyebrow mb-2">{group}</div>
                <ul className="-mx-2">
                  {items.map((r) => (
                    <li key={r.href + r.label}>
                      <button
                        type="button"
                        onClick={() => go(r.href)}
                        className="flex w-full items-baseline justify-between gap-4 px-2 py-2 text-left transition-colors hover:bg-surface"
                      >
                        <span className="text-[14px] text-charcoal">
                          {r.label}
                        </span>
                        <span className="meta shrink-0 truncate">
                          {r.detail}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-3 meta">
          <span>Pesquisa global</span>
          <span>Esc para fechar</span>
        </div>
      </div>
    </div>
  );
}
