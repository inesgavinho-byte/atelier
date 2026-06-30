"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ago } from "@/components/mission/bits";
import {
  runMinionNow,
  setMinionAutonomy,
  setMinionState,
  setSignalStatus,
} from "@/app/(main)/decimins/actions";
import type { Minion, MinionSignal } from "@/lib/minions";

const AUTONOMY_LABELS = [
  "Desligado",
  "Observar",
  "Resumir",
  "Recomendar",
  "Preparar acção",
  "Executar com aprovação",
];

const KIND_LABELS: Record<string, string> = {
  info: "Info",
  warning: "Aviso",
  decision_required: "Decisão",
  opportunity: "Oportunidade",
  risk: "Risco",
  pattern: "Padrão",
};

/** Cross-Space pattern types → label + colour family (Pattern Decimin). */
const PATTERN_TYPE: Record<string, { label: string; tone: string }> = {
  repeated: { label: "Repetido", tone: "amber" },
  relation: { label: "Relação", tone: "violet" },
  signal: { label: "Sinal fraco", tone: "blue" },
  opportunity: { label: "Oportunidade", tone: "green" },
  risk: { label: "Risco", tone: "red" },
};

/** A detected cross-Space pattern as a card with expandable evidence. */
function PatternCard({ s }: { s: MinionSignal }) {
  const [open, setOpen] = useState(false);
  const meta = s.metadata ?? {};
  const t = PATTERN_TYPE[meta.type ?? ""] ?? { label: "Padrão", tone: "violet" };
  const spaces = meta.spaces ?? [];
  return (
    <div className={`pattern-card pattern-${t.tone}`}>
      <div className="pattern-card-head">
        <span className={`pattern-badge pattern-badge-${t.tone}`}>{t.label}</span>
        {spaces.length ? (
          <span className="pattern-spaces">{spaces.join(" · ")}</span>
        ) : null}
        {typeof meta.confidence === "number" ? (
          <span className="pattern-conf">{meta.confidence}%</span>
        ) : null}
      </div>
      <span className="minion-sig-title">{s.signal}</span>
      {s.recommendedAction ? (
        <span className="minion-sig-sub">{s.recommendedAction}</span>
      ) : null}
      {s.evidence.length ? (
        <details className="pattern-evidence" open={open}>
          <summary onClick={() => setOpen((v) => !v)}>
            Evidência ({s.evidence.length})
          </summary>
          <ul>
            {s.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/** Derive the status colour family for a minion card. */
function minionTone(m: Minion): "green" | "amber" | "red" | "grey" {
  if (m.state === "error") return "red";
  if (m.state === "paused") return "grey";
  if (m.pendingCount > 0) return "amber";
  return "green";
}

function AutonomyDots({ level }: { level: number }) {
  return (
    <span className="minion-dots" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`minion-dot${i <= level ? " on" : ""}`}
        />
      ))}
    </span>
  );
}

export default function MinionsBoard({
  minions,
  pendingSignals,
  signalsByMinion,
}: {
  minions: Minion[];
  pendingSignals: MinionSignal[];
  signalsByMinion: Record<string, MinionSignal[]>;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const open = minions.find((m) => m.id === openId) ?? null;
  const minionName = (id: string) =>
    minions.find((m) => m.id === id)?.name ?? "Decimin";

  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <>
      {/* Pending signals — consolidated, only when there is something */}
      {pendingSignals.length > 0 ? (
        <section className="minion-pending">
          <div className="minion-pending-head">
            <span className="ctx-section-title">Sinais pendentes</span>
            <span className="minion-count">{pendingSignals.length}</span>
          </div>
          <div className="minion-cards">
            {pendingSignals.map((s) => (
              <div
                key={s.id}
                className={`minion-sig minion-sig-${
                  s.kind === "risk" ? "red" : s.approvalRequired ? "amber" : "violet"
                }`}
              >
                <span className="minion-signal-meta">
                  {minionName(s.minionId)} · {KIND_LABELS[s.kind] ?? s.kind}
                </span>
                <span className="minion-sig-title">{s.signal}</span>
                {s.recommendedAction ? (
                  <span className="minion-sig-sub">{s.recommendedAction}</span>
                ) : null}
                <div className="minion-sig-actions">
                  {s.approvalRequired ? (
                    <Link href="/decisions" className="btn-approve btn-sm">
                      Ver em Decisões
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="btn-quiet btn-sm"
                    disabled={busy}
                    onClick={() => act(() => setSignalStatus(s.id, "reviewed"))}
                  >
                    Marcar revisto
                  </button>
                  <button
                    type="button"
                    className="btn-quiet btn-sm"
                    disabled={busy}
                    onClick={() => act(() => setSignalStatus(s.id, "dismissed"))}
                  >
                    Arquivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Grid of minion cards */}
      <div className="minion-grid">
        {minions.map((m) => {
          const tone = minionTone(m);
          return (
            <button
              key={m.id}
              type="button"
              className={`minion-card minion-tone-${tone}`}
              onClick={() => setOpenId(m.id)}
            >
              <div className="minion-card-head">
                <span className="minion-status-dot" />
                <span className="minion-card-name">{m.name}</span>
                <span className="minion-card-state">
                  {m.state === "active"
                    ? "Activo"
                    : m.state === "paused"
                      ? "Pausado"
                      : "Erro"}
                </span>
              </div>
              <p className="minion-card-mission">{m.mission}</p>
              <p className="minion-card-meta">
                {m.lastRunAt
                  ? `Última: ${ago(m.lastRunAt)}`
                  : "Ainda não correu"}
                {m.nextRunAt ? ` · Próxima: ${ago(m.nextRunAt)}` : ""}
              </p>
              {m.pendingCount > 0 ? (
                <p className="minion-card-signals">
                  {m.pendingCount}{" "}
                  {m.pendingCount === 1 ? "sinal" : "sinais"} por rever
                </p>
              ) : (
                <p className="minion-card-meta">Sem sinais pendentes</p>
              )}
              <div className="minion-card-foot">
                <AutonomyDots level={m.autonomyLevel} />
                <span className="minion-card-level">
                  Nível {m.autonomyLevel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Drawer */}
      {open ? (
        <>
          <div className="import-drawer-backdrop" onClick={() => setOpenId(null)} />
          <aside className="import-drawer" role="dialog" aria-label={open.name}>
            <header className="import-drawer-header">
              <h2 className="import-drawer-title">{open.name}</h2>
              <button
                type="button"
                className="import-btn-quiet"
                onClick={() => setOpenId(null)}
              >
                Fechar
              </button>
            </header>

            <div className="import-drawer-body">
              <p className="import-hint">{open.mission}</p>

              <p className="minion-card-meta">
                Estado: {open.state}
                {open.lastRunAt ? ` · última ${ago(open.lastRunAt)}` : ""}
                {open.nextRunAt ? ` · próxima ${ago(open.nextRunAt)}` : ""}
              </p>
              {open.lastError ? (
                <p className="ctx-repo-err">{open.lastError}</p>
              ) : null}

              {/* Autonomy */}
              <div className="import-field">
                <span className="import-label">
                  Autonomia — {AUTONOMY_LABELS[open.autonomyLevel]}
                </span>
                <div className="minion-autonomy-row">
                  {[0, 1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={`minion-autonomy-btn${
                        lvl === open.autonomyLevel ? " on" : ""
                      }`}
                      disabled={busy}
                      onClick={() => act(() => setMinionAutonomy(open.id, lvl))}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="minion-drawer-actions">
                <button
                  type="button"
                  className="import-btn"
                  disabled={busy}
                  onClick={() => act(() => runMinionNow(open.id))}
                >
                  Executar agora
                </button>
                {open.state === "paused" ? (
                  <button
                    type="button"
                    className="import-btn-quiet"
                    disabled={busy}
                    onClick={() => act(() => setMinionState(open.id, "active"))}
                  >
                    Retomar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="import-btn-quiet"
                    disabled={busy}
                    onClick={() => act(() => setMinionState(open.id, "paused"))}
                  >
                    Pausar
                  </button>
                )}
              </div>

              {/* Recent signals — pattern cards for the Pattern Decimin */}
              <div className="import-field">
                <span className="import-label">
                  {open.slug === "pattern" ? "Padrões detectados" : "Sinais recentes"}
                </span>
                {(signalsByMinion[open.id] ?? []).length === 0 ? (
                  <p className="ctx-empty">
                    {open.slug === "pattern"
                      ? "Ainda sem padrões. Corre «Executar agora» para testar."
                      : "Ainda sem sinais."}
                  </p>
                ) : open.slug === "pattern" ? (
                  <div className="minion-cards">
                    {(signalsByMinion[open.id] ?? []).map((s) => (
                      <PatternCard key={s.id} s={s} />
                    ))}
                  </div>
                ) : (
                  <div className="minion-cards">
                    {(signalsByMinion[open.id] ?? []).map((s) => (
                      <div key={s.id} className="minion-sig">
                        <span className="minion-signal-meta">
                          {KIND_LABELS[s.kind] ?? s.kind} · {ago(s.createdAt)} ·{" "}
                          {s.status}
                        </span>
                        <span className="minion-sig-title">{s.signal}</span>
                        {s.interpretation ? (
                          <span className="minion-sig-sub">{s.interpretation}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
