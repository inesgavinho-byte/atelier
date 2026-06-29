"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ago } from "@/components/mission/bits";
import {
  startSession,
  endSession,
  archiveSession,
} from "@/app/(main)/workspaces/[workspaceId]/session-actions";
import { SESSION_SKILLS, type WorkspaceSession } from "@/lib/sessions-constants";

/**
 * Sessions with intent (ADR-0005 F2). Start an intentful session (objective +
 * skill), end or archive it. Each lifecycle change lands on the Timeline. The
 * always-on continuous chat is unaffected.
 */
export default function SessionsPanel({
  workspaceId,
  sessions,
}: {
  workspaceId: string;
  sessions: WorkspaceSession[];
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [objective, setObjective] = useState("");
  const [skill, setSkill] = useState<string>(SESSION_SKILLS[0]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const begin = () =>
    start(async () => {
      const r = await startSession({ workspaceId, objective, skill });
      setMsg(r.message);
      if (r.ok) {
        setObjective("");
        setOpen(false);
        router.refresh();
      }
    });

  const finish = (id: string) =>
    start(async () => {
      const r = await endSession({ id, workspaceId });
      setMsg(r.message);
      router.refresh();
    });

  const archive = (id: string) =>
    start(async () => {
      const r = await archiveSession({ id, workspaceId });
      setMsg(r.message);
      router.refresh();
    });

  const duration = (s: WorkspaceSession) => {
    if (!s.endedAt) return null;
    const ms = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
    const mins = Math.max(1, Math.round(ms / 60000));
    return mins < 60 ? `${mins} min` : `${(mins / 60).toFixed(1)} h`;
  };

  return (
    <div className="sess">
      <div className="sess-head">
        <button
          type="button"
          className="ctx-mini-action"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Fechar" : "+ Iniciar sessão"}
        </button>
      </div>

      {open ? (
        <div className="sess-form">
          <input
            type="text"
            className="sess-input"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Objectivo da sessão…"
          />
          <select
            className="sess-skill"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            aria-label="Skill da sessão"
          >
            {SESSION_SKILLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={begin}
            disabled={busy || !objective.trim()}
          >
            Iniciar
          </button>
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <p className="ctx-empty">Ainda não há sessões.</p>
      ) : (
        <div className="ctx-cards">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`ctx-card sess-card sess-${s.state}`}
            >
              <span className="ctx-card-row">
                <span className="sess-state-dot" />
                <span className="ctx-card-title">{s.objective}</span>
              </span>
              <span className="sess-meta">
                {s.skill ? `${s.skill} · ` : ""}
                {s.state === "active"
                  ? `activa · ${ago(s.startedAt)}`
                  : `${s.state === "completed" ? "concluída" : "arquivada"}${
                      duration(s) ? ` · ${duration(s)}` : ""
                    }`}
              </span>
              <span className="sess-actions">
                {s.state === "active" ? (
                  <button
                    type="button"
                    className="action-quiet"
                    onClick={() => finish(s.id)}
                    disabled={busy}
                  >
                    Terminar
                  </button>
                ) : s.state === "completed" ? (
                  <button
                    type="button"
                    className="action-quiet"
                    onClick={() => archive(s.id)}
                    disabled={busy}
                  >
                    Arquivar
                  </button>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      )}

      {msg ? <p className="meta mt-2">{msg}</p> : null}
    </div>
  );
}
