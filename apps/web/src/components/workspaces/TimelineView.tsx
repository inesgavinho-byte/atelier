"use client";

import { useMemo, useState } from "react";
import { ago } from "@/components/mission/bits";
import type { TimelineEvent, TimelineKind } from "@/lib/timeline";

/**
 * TimelineView — the chronological memory of a workspace (ADR-0005 F2).
 * Read-only; filters by event kind on the client.
 */

const KIND_LABELS: Partial<Record<TimelineKind, string>> = {
  chat: "Conversa",
  reading: "Leitura",
  capture: "Captura",
  decision: "Decisão",
  artifact: "Artefacto",
  commit: "Commit",
  pr: "PR",
  deploy: "Deploy",
  session_start: "Sessão",
  session_end: "Sessão",
  note: "Nota",
  activity: "Actividade",
};

export default function TimelineView({ events }: { events: TimelineEvent[] }) {
  const kinds = useMemo(() => {
    const set = new Set<TimelineKind>();
    for (const e of events) set.add(e.kind);
    return Array.from(set);
  }, [events]);

  const [active, setActive] = useState<TimelineKind | "all">("all");
  const shown =
    active === "all" ? events : events.filter((e) => e.kind === active);

  if (events.length === 0) {
    return <p className="ctx-empty">Ainda não há eventos neste workspace.</p>;
  }

  return (
    <div className="tl">
      <div className="tl-filters">
        <button
          type="button"
          className={`tl-pill${active === "all" ? " active" : ""}`}
          onClick={() => setActive("all")}
        >
          Tudo
        </button>
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            className={`tl-pill${active === k ? " active" : ""}`}
            onClick={() => setActive(k)}
          >
            {KIND_LABELS[k] ?? k}
          </button>
        ))}
      </div>

      <ul className="tl-list">
        {shown.map((e) => (
          <li key={e.id} className="tl-row">
            <span className={`tl-dot tl-dot-${e.kind}`} />
            <div className="tl-body">
              <p className="tl-title">{e.title}</p>
              <p className="tl-meta">
                <span className="tl-kind">{KIND_LABELS[e.kind] ?? e.kind}</span>
                {e.actor ? ` · ${e.actor}` : ""}
                {` · ${ago(e.at)}`}
              </p>
              {e.body ? <p className="tl-extra">{e.body}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
