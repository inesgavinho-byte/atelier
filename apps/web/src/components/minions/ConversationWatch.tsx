"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ago } from "@/components/mission/bits";
import {
  setGroupWorkspace,
  setPendingItemStatus,
} from "@/app/(main)/minions/actions";
import type { TelegramGroup, PendingItem } from "@/lib/conversation-watch";

/**
 * Conversation Watch (ADR-0006) — the Personal Decimin's first capability.
 * Shows the observed Telegram groups (and lets the user route a group to a
 * workspace) and the recent pending items it surfaced. Read + nudge only; the
 * worker does the observing.
 */

const KIND_LABELS: Record<string, string> = {
  request: "pedido",
  commitment: "compromisso",
  promised_file: "ficheiro prometido",
  deadline: "prazo",
  unanswered_question: "pergunta sem resposta",
  decision: "decisão",
  risk: "risco",
};

export default function ConversationWatch({
  groups,
  items,
  workspaces,
}: {
  groups: TelegramGroup[];
  items: PendingItem[];
  workspaces: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const link = (groupId: string, workspaceId: string) =>
    start(async () => {
      const r = await setGroupWorkspace(groupId, workspaceId || null);
      setMsg(r.message);
      router.refresh();
    });

  const resolve = (id: string, status: "resolved" | "dismissed") =>
    start(async () => {
      const r = await setPendingItemStatus(id, status);
      setMsg(r.message);
      router.refresh();
    });

  return (
    <section className="cw">
      <header className="cw-head">
        <h2 className="eyebrow">Conversation Watch</h2>
        <p className="meta">
          Grupos de Telegram observados pelo Personal Decimin. Nada de respostas
          automáticas — só deteta o que fica por responder.
        </p>
      </header>

      {/* Observed groups */}
      {groups.length === 0 ? (
        <p className="panel p-4 meta">
          O bot ainda não foi adicionado a nenhum grupo. Adiciona-o a um grupo de
          Telegram para começar a observar (com a privacidade do bot desligada no
          @BotFather).
        </p>
      ) : (
        <ul className="cw-groups">
          {groups.map((g) => (
            <li key={g.id} className="cw-group">
              <div className="cw-group-main">
                <span className="cw-group-title">{g.title}</span>
                <span className="cw-group-meta">
                  {g.active ? `nível ${g.autonomyLevel}` : "inactivo"}
                  {g.pendingCount > 0 ? ` · ${g.pendingCount} pendente(s)` : ""}
                </span>
              </div>
              <select
                className="cw-select"
                value={g.workspaceId ?? ""}
                disabled={busy}
                onChange={(e) => link(g.id, e.target.value)}
                aria-label={`Ligar ${g.title} a um workspace`}
              >
                <option value="">Pessoal (Inbox)</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      {/* Recent pending items */}
      <h3 className="cw-subhead">Pendentes recentes</h3>
      {items.length === 0 ? (
        <p className="meta">Sem pendentes. ✨</p>
      ) : (
        <ul className="cw-items">
          {items.map((it) => (
            <li key={it.id} className="cw-item">
              <div className="cw-item-main">
                <span className="cw-item-kind">
                  {KIND_LABELS[it.kind] ?? it.kind}
                </span>
                <span className="cw-item-desc">{it.description}</span>
                <span className="cw-item-meta">
                  {it.groupTitle}
                  {it.fromPerson ? ` · ${it.fromPerson}` : ""}
                  {it.dueDate ? ` · prazo ${it.dueDate}` : ""}
                  {` · ${ago(it.createdAt)}`}
                </span>
              </div>
              <div className="cw-item-actions">
                <button
                  type="button"
                  className="action"
                  onClick={() => resolve(it.id, "resolved")}
                  disabled={busy}
                >
                  Resolver
                </button>
                <button
                  type="button"
                  className="action-quiet"
                  onClick={() => resolve(it.id, "dismissed")}
                  disabled={busy}
                >
                  Dispensar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {msg ? <p className="meta mt-2">{msg}</p> : null}
    </section>
  );
}
