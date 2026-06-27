/**
 * Mission Control — small shared visual primitives.
 * Quiet, editorial: thin rules, a single ink colour, restrained accents.
 */
import type { ReactNode } from "react";
import type {
  AgentState,
  ObjectiveStatus,
  Priority,
} from "@/data/mission";

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: "Prioridade alta",
  média: "Prioridade média",
  baixa: "Prioridade baixa",
};

export const STATE_LABEL: Record<AgentState, string> = {
  "em execução": "Em execução",
  "a aguardar": "A aguardar",
  "em revisão": "Em revisão",
  inativo: "Inativo",
};

const STATE_DOT: Record<AgentState, string> = {
  "em execução": "bg-olive",
  "a aguardar": "bg-beige",
  "em revisão": "bg-olive",
  inativo: "bg-line-strong",
};

const PRIORITY_DOT: Record<Priority, string> = {
  alta: "bg-charcoal",
  média: "bg-olive",
  baixa: "bg-beige",
};

const OBJECTIVE_DOT: Record<ObjectiveStatus, string> = {
  "em risco": "bg-charcoal",
  "a decorrer": "bg-olive",
  concluído: "bg-line-strong",
};

export function Dot({ className }: { className: string }) {
  return <span className={`dot ${className}`} aria-hidden />;
}

export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-muted">
      <Dot className={PRIORITY_DOT[priority]} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function StateTag({ state }: { state: AgentState }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-muted">
      <Dot className={STATE_DOT[state]} />
      {STATE_LABEL[state]}
    </span>
  );
}

export function ObjectiveDot({ status }: { status: ObjectiveStatus }) {
  return <Dot className={OBJECTIVE_DOT[status]} />;
}

/** Thin progress meter — a hairline, never a chunky bar. */
export function Meter({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-px w-full bg-line" role="presentation">
      <div className="h-px bg-olive" style={{ width: `${v}%` }} />
    </div>
  );
}

/** A short, spaced section label with an optional trailing element. */
export function SectionHead({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4">
      <h2 className="eyebrow">{children}</h2>
      {aside ? <div className="meta">{aside}</div> : null}
    </div>
  );
}

/** Format an ISO timestamp as a quiet hour or short date. */
export function ago(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-PT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
