import Link from "next/link";
import type { ReactNode } from "react";
import type {
  AgentStatus,
  ProjectStatus,
  RiskLevel,
  Urgency,
  WorkstreamStatus,
} from "@/data/types";

/* ── Page header ───────────────────────────────────────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="mb-10 md:mb-14">
      {eyebrow ? <div className="eyebrow mb-3">{eyebrow}</div> : null}
      <h1 className="text-4xl md:text-5xl">{title}</h1>
      {lead ? (
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
          {lead}
        </p>
      ) : null}
    </header>
  );
}

/* ── Section ───────────────────────────────────────────────────────────── */

export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="eyebrow">{title}</h2>
        {aside ? <div className="meta">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/* ── Status dot ────────────────────────────────────────────────────────── */

const DOT_COLOR: Record<string, string> = {
  // agent
  active: "bg-olive",
  running: "bg-charcoal",
  waiting: "bg-beige",
  review: "bg-olive",
  not_connected: "bg-line-strong",
  planned: "bg-line-strong",
  // workstream
  blocked: "bg-charcoal",
  queued: "bg-beige",
  done: "bg-line-strong",
  // project
  incubating: "bg-beige",
  paused: "bg-line-strong",
  strategic: "bg-olive",
  // urgency / risk
  now: "bg-charcoal",
  soon: "bg-olive",
  later: "bg-beige",
  low: "bg-line-strong",
  medium: "bg-beige",
  high: "bg-charcoal",
};

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`dot ${DOT_COLOR[status] ?? "bg-line-strong"}`}
      aria-hidden="true"
    />
  );
}

export function StatusTag({
  status,
  label,
}: {
  status:
    | AgentStatus
    | ProjectStatus
    | WorkstreamStatus
    | Urgency
    | RiskLevel
    | string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] text-muted">
      <StatusDot status={status} />
      {label}
    </span>
  );
}

/* ── Quiet card link ───────────────────────────────────────────────────── */

export function CardLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block panel p-6 transition-colors hover:border-line-strong"
    >
      {children}
    </Link>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="meta italic border border-dashed border-line px-6 py-8 text-center">
      {children}
    </p>
  );
}
