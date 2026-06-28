"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ago } from "@/components/mission/bits";

export interface TimelineItem {
  id: string;
  kindLabel: string;
  title: string;
  at: string;
  initiativeName?: string;
  initiativeSlug?: string;
}

const FILTERS = ["Tudo", "PAPERS", "DECIMA", "GAVINHO", "NUDO"] as const;

/**
 * Chronological activity (descending) with initiative filters
 * (EPIC-001 §Timeline). Filtering is local; the list is already sorted.
 */
export default function Timeline({ items }: { items: TimelineItem[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tudo");

  const filtered = useMemo(
    () =>
      filter === "Tudo"
        ? items
        : items.filter((i) => i.initiativeName === filter),
    [filter, items]
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-5 border-b border-line pb-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={[
              "text-[13px] transition-colors",
              filter === f
                ? "border-b border-charcoal pb-0.5 text-charcoal"
                : "text-muted hover:text-charcoal",
            ].join(" ")}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="meta italic">Sem atividade para este filtro.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {filtered.map((e) => (
            <li key={e.id} className="grid gap-2 py-5 sm:grid-cols-[140px_1fr]">
              <div className="meta">
                <div className="eyebrow">{e.kindLabel}</div>
                <div className="mt-1">{ago(e.at)}</div>
              </div>
              <div>
                <p className="text-[15px] text-charcoal">{e.title}</p>
                {e.initiativeSlug ? (
                  <Link
                    href={`/workspaces/${e.initiativeSlug}`}
                    className="meta mt-1 inline-block hover:text-charcoal"
                  >
                    {e.initiativeName}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
