"use client";

import { useEffect, useState } from "react";
import {
  IconTarget,
  IconChevronDown,
  IconChevronRight,
  IconArrowRight,
} from "@tabler/icons-react";
import { ago } from "@/components/mission/bits";
import type { MissionState } from "@/lib/mission-engine";

/**
 * Mission Engine v1 (Bloco C) — a collapsible band above the chat. Shows the
 * inferred progress, what changed since last time, the highest-ROI next step
 * and a confidence score. Display-only; the collapse state persists per
 * workspace in localStorage.
 */

const KIND_LABEL: Record<string, string> = {
  decision: "decisão",
  artifact: "artefacto",
  reading: "leitura",
  chat: "conversa",
  activity: "actividade",
  commit: "commit",
  pr: "PR",
  deploy: "deploy",
  capture: "captura",
  note: "nota",
};

export default function MissionEngine({
  workspaceId,
  state,
}: {
  workspaceId: string;
  state: MissionState;
}) {
  const key = `atelier-mission-${workspaceId}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key);
      if (v !== null) setOpen(v === "1");
    } catch {
      /* ignore */
    }
  }, [key]);

  const toggle = () =>
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  const confLabel =
    state.confidence >= 67 ? "alta" : state.confidence >= 34 ? "média" : "baixa";

  return (
    <section className="me">
      <button
        type="button"
        className="me-head"
        onClick={toggle}
        aria-expanded={open}
      >
        <IconTarget size={16} stroke={1.7} className="me-head-icon" />
        <span className="me-head-title">Estado da missão</span>
        <span className="me-head-progress">{state.progress}%</span>
        <span className="me-head-chevron">
          {open ? (
            <IconChevronDown size={14} stroke={1.8} />
          ) : (
            <IconChevronRight size={14} stroke={1.8} />
          )}
        </span>
      </button>

      {open ? (
        <div className="me-body">
          {/* Progress */}
          <div className="me-progress">
            <div className="me-progress-track">
              <div
                className="me-progress-fill"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <span className="me-confidence" title="Confiança baseada na evidência disponível">
              confiança {confLabel} · {state.confidence}%
            </span>
          </div>

          {/* Next step */}
          {state.nextStep ? (
            <div className="me-next">
              <IconArrowRight size={15} stroke={1.8} className="me-next-icon" />
              <span className="me-next-body">
                <span className="me-next-action">{state.nextStep.action}</span>
                <span className="me-next-why">{state.nextStep.why}</span>
              </span>
            </div>
          ) : null}

          {/* What changed */}
          <div className="me-changed">
            <p className="me-changed-title">O que mudou</p>
            {state.changed.length === 0 ? (
              <p className="me-empty">Sem actividade recente.</p>
            ) : (
              <ul className="me-changed-list">
                {state.changed.map((c, i) => (
                  <li key={i} className="me-changed-item">
                    <span className="me-changed-kind">
                      {KIND_LABEL[c.kind] ?? c.kind}
                    </span>
                    <span className="me-changed-text">{c.title}</span>
                    <span className="me-changed-at">{ago(c.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
