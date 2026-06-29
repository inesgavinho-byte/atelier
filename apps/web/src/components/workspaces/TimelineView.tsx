"use client";

import { useMemo, useState } from "react";
import {
  IconMessage,
  IconBook,
  IconNote,
  IconCheck,
  IconBox,
  IconFile,
  IconDownload,
  IconGitCommit,
  IconGitPullRequest,
  IconRocket,
  IconClock,
  IconActivity,
  type Icon,
} from "@tabler/icons-react";
import { ago } from "@/components/mission/bits";
import type { TimelineEvent, TimelineKind } from "@/lib/timeline";

/**
 * TimelineView — the chronological memory of a workspace (ADR-0005 F2 / Bloco F).
 * Read-only; an icon per kind, filters by kind on the client.
 */

const KIND_LABELS: Partial<Record<TimelineKind, string>> = {
  chat: "Conversa",
  reading: "Leitura",
  capture: "Captura",
  decision: "Decisão",
  artifact: "Artefacto",
  document: "Documento",
  import: "Importação",
  commit: "Commit",
  pr: "PR",
  deploy: "Deploy",
  session_start: "Sessão",
  session_end: "Sessão",
  note: "Nota",
  activity: "Actividade",
};

const KIND_ICONS: Partial<Record<TimelineKind, Icon>> = {
  chat: IconMessage,
  reading: IconBook,
  capture: IconNote,
  decision: IconCheck,
  artifact: IconBox,
  document: IconFile,
  import: IconDownload,
  commit: IconGitCommit,
  pr: IconGitPullRequest,
  deploy: IconRocket,
  session_start: IconClock,
  session_end: IconClock,
  note: IconNote,
  activity: IconActivity,
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
        {shown.map((e) => {
          const Ico = KIND_ICONS[e.kind];
          return (
          <li key={e.id} className="tl-row">
            <span className={`tl-dot tl-dot-${e.kind}`} />
            <div className="tl-body">
              <p className="tl-title">
                {Ico ? (
                  <Ico size={14} stroke={1.8} className="tl-title-icon" />
                ) : null}
                {e.title}
              </p>
              <p className="tl-meta">
                <span className="tl-kind">{KIND_LABELS[e.kind] ?? e.kind}</span>
                {e.actor ? ` · ${e.actor}` : ""}
                {` · ${ago(e.at)}`}
              </p>
              {e.body ? <p className="tl-extra">{e.body}</p> : null}
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
