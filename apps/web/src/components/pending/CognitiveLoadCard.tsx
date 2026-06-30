"use client";

import { useEffect, useState } from "react";
import {
  IconBrain,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import type { CognitiveLoad } from "@/lib/cognitive-load";

/**
 * Cognitive Load card (Personal Decimin v2). Shows the mental-load band, the
 * open loops behind it and a single recommendation. Collapsible; the collapsed
 * state persists in localStorage. When collapsed it stays a one-line summary.
 */
export default function CognitiveLoadCard({ load }: { load: CognitiveLoad }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("atelier-cogload-open");
      if (v !== null) setOpen(v === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () =>
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("atelier-cogload-open", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  const metrics = [
    { label: "Decisões por decidir", value: load.pendingDecisions },
    { label: "Compromissos pendentes", value: load.pendingCommitments },
    { label: "Sessões abertas", value: load.openSessions },
    { label: "Conversas (24h)", value: load.openConversations },
  ];

  return (
    <section className={`cl cl-${load.band}`}>
      <button type="button" className="cl-head" onClick={toggle} aria-expanded={open}>
        <IconBrain size={15} stroke={1.7} className="cl-head-icon" />
        <span className="cl-eyebrow">Carga cognitiva</span>
        <span className="cl-band">{load.band}</span>
        <span className="cl-head-chevron">
          {open ? (
            <IconChevronDown size={14} stroke={1.8} />
          ) : (
            <IconChevronRight size={14} stroke={1.8} />
          )}
        </span>
      </button>

      <div className="cl-bar">
        <div className="cl-bar-fill" style={{ width: `${load.score}%` }} />
      </div>

      {open ? (
        <>
          <div className="cl-metrics">
            {metrics.map((m) => (
              <div key={m.label} className="cl-metric">
                <span className="cl-metric-value">{m.value}</span>
                <span className="cl-metric-label">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="cl-reco">{load.recommendation}</p>
        </>
      ) : null}
    </section>
  );
}
