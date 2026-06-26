"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Decision, DecisionStatus } from "@/data/mission";
import { PriorityTag } from "@/components/mission/bits";
import { setDecisionStatus } from "@/app/(main)/actions";

const RESOLVED: Record<Exclude<DecisionStatus, "pendente">, string> = {
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  adiada: "Adiada",
  revisão: "Revisão pedida",
};

/**
 * A decision in the judgement queue. The user can read the context inline and
 * act inline — approve, reject, defer, request review — without changing page
 * (EPIC-001 §Interação). Resolution updates local state, with undo.
 */
export default function DecisionItem({
  decision,
  initiativeName,
  initiativeSlug,
  agentRole,
}: {
  decision: Decision;
  initiativeName: string;
  initiativeSlug?: string;
  agentRole: string;
}) {
  const [status, setStatus] = useState<DecisionStatus>(decision.status);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const resolved = status !== "pendente";

  // Optimistic local update + persist to the database.
  const resolve = (next: DecisionStatus) => {
    setStatus(next);
    startTransition(() => {
      void setDecisionStatus(decision.id, next);
    });
  };

  return (
    <article
      className={[
        "border-b border-line py-6 transition-opacity first:pt-0",
        resolved ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <PriorityTag priority={decision.priority} />
          <h3 className="mt-2 font-serif text-2xl leading-snug">
            {decision.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 meta">
            {initiativeSlug ? (
              <Link
                href={`/initiatives/${initiativeSlug}`}
                className="hover:text-charcoal"
              >
                {initiativeName}
              </Link>
            ) : (
              <span>{initiativeName}</span>
            )}
            <span aria-hidden>·</span>
            <span>{agentRole}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-l-2 border-line-strong pl-4">
        <span className="eyebrow">Recomendação</span>
        <p className="mt-1 text-[15px] leading-relaxed">
          {decision.recommendation}
        </p>
      </div>

      {open ? (
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="eyebrow mb-1">Contexto</dt>
            <dd className="text-[14.5px] leading-relaxed text-charcoal/90">
              {decision.context}
            </dd>
          </div>
          <div>
            <dt className="eyebrow mb-1">Impacto</dt>
            <dd className="text-[14.5px] leading-relaxed text-charcoal/90">
              {decision.impact}
            </dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        {resolved ? (
          <>
            <span className="inline-flex items-center gap-2 text-[13px] text-charcoal">
              <span className="dot bg-olive" />
              {RESOLVED[status as Exclude<DecisionStatus, "pendente">]}
            </span>
            <button
              type="button"
              className="action-quiet"
              onClick={() => resolve("pendente")}
            >
              Anular
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="action"
              onClick={() => resolve("aprovada")}
            >
              Aprovar
            </button>
            <button
              type="button"
              className="action"
              onClick={() => resolve("revisão")}
            >
              Pedir revisão
            </button>
            <button
              type="button"
              className="action-quiet"
              onClick={() => resolve("adiada")}
            >
              Adiar
            </button>
            <button
              type="button"
              className="action-quiet"
              onClick={() => resolve("rejeitada")}
            >
              Rejeitar
            </button>
            <span className="mx-1 h-4 w-px bg-line" aria-hidden />
            <button
              type="button"
              className="action-quiet"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {open ? "Fechar contexto" : "Abrir contexto"}
            </button>
            <Link href={`/decisions/${decision.id}`} className="action-quiet">
              Ver tudo →
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
