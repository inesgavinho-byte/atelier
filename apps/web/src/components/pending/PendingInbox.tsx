"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ago } from "@/components/mission/bits";
import { setPendingItemStatus } from "@/app/(main)/decimins/actions";

/**
 * Pending Intelligence (Personal Decimin v2). A living list of what was asked
 * and not yet received — detected by Conversation Watch, never hand-kept.
 * Grouped by Space, aged, with resolve/dismiss. Display surface only; the
 * worker does the detecting.
 */

export interface PendingInboxItem {
  id: string;
  space: string;
  groupTitle: string;
  kind: string;
  description: string;
  fromPerson: string | null;
  dueDate: string | null;
  confidence: number | null;
  confidenceReason: string | null;
  createdAt: string;
}

/** Confidence band → label + class (Personal Decimin v2). */
function confidenceBand(c: number): { pct: string; cls: string } {
  const pct = `${Math.round(c * 100)}%`;
  const cls = c >= 0.8 ? "pi-conf-high" : c >= 0.5 ? "pi-conf-mid" : "pi-conf-low";
  return { pct, cls };
}

const KIND_LABELS: Record<string, string> = {
  request: "pedido",
  commitment: "compromisso",
  promised_file: "ficheiro prometido",
  deadline: "prazo",
  unanswered_question: "pergunta sem resposta",
  decision: "decisão",
  risk: "risco",
};

/** Whole days since a timestamp. */
function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export default function PendingInbox({ items }: { items: PendingInboxItem[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const groups = useMemo(() => {
    const m = new Map<string, PendingInboxItem[]>();
    for (const it of items) {
      const arr = m.get(it.space);
      if (arr) arr.push(it);
      else m.set(it.space, [it]);
    }
    return Array.from(m.entries());
  }, [items]);

  const act = (id: string, status: "resolved" | "dismissed") =>
    start(async () => {
      const r = await setPendingItemStatus(id, status);
      setMsg(r.message);
      router.refresh();
    });

  if (items.length === 0) {
    return (
      <p className="panel p-4 meta">
        Nada pendente. ✨ O que for pedido e ficar por responder nas conversas
        observadas aparece aqui automaticamente.
      </p>
    );
  }

  return (
    <div className="pi">
      {groups.map(([space, list]) => (
        <section key={space} className="pi-group">
          <h2 className="pi-group-title">
            {space} <span className="pi-group-count">{list.length}</span>
          </h2>
          <ul className="pi-list">
            {list.map((it) => {
              const d = daysSince(it.createdAt);
              const stale = d >= 3;
              return (
                <li key={it.id} className="pi-item">
                  <div className="pi-item-main">
                    <span className="pi-item-kindrow">
                      <span className="pi-item-kind">
                        {KIND_LABELS[it.kind] ?? it.kind}
                      </span>
                      {it.confidence !== null
                        ? (() => {
                            const { pct, cls } = confidenceBand(it.confidence!);
                            return (
                              <span
                                className={`pi-conf ${cls}`}
                                title={it.confidenceReason ?? "Confiança do Personal Decimin"}
                              >
                                {pct}
                              </span>
                            );
                          })()
                        : null}
                    </span>
                    <span className="pi-item-desc">{it.description}</span>
                    <span className="pi-item-meta">
                      {it.fromPerson ? `${it.fromPerson} · ` : ""}
                      {it.groupTitle}
                      {it.dueDate ? ` · prazo ${it.dueDate}` : ""}
                      <span className={stale ? "pi-age-stale" : "pi-age"}>
                        {` · há ${d === 0 ? "menos de 1 dia" : `${d} dia${d === 1 ? "" : "s"}`}`}
                      </span>
                    </span>
                    {it.confidence !== null && it.confidenceReason ? (
                      <span className="pi-conf-reason">
                        <strong>{Math.round(it.confidence * 100)}%</strong> —{" "}
                        {it.confidenceReason}
                      </span>
                    ) : null}
                  </div>
                  <div className="pi-item-actions">
                    <button
                      type="button"
                      className="action"
                      onClick={() => act(it.id, "resolved")}
                      disabled={busy}
                    >
                      Resolver
                    </button>
                    <button
                      type="button"
                      className="action-quiet"
                      onClick={() => act(it.id, "dismissed")}
                      disabled={busy}
                    >
                      Dispensar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {msg ? <p className="meta mt-2">{msg}</p> : null}
    </div>
  );
}
