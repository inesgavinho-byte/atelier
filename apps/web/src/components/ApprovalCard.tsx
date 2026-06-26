"use client";

import { useState } from "react";
import Link from "next/link";
import type { Approval, ApprovalStatus } from "@/data/types";
import {
  APPROVAL_TYPE_LABELS,
  RISK_LABELS,
  URGENCY_LABELS,
} from "@/lib/format";
import { StatusTag } from "@/components/ui";

const RESOLVED_COPY: Record<Exclude<ApprovalStatus, "pending">, string> = {
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
};

export default function ApprovalCard({
  approval,
  projectName,
  projectSlug,
  agentRole,
  variant = "full",
}: {
  approval: Approval;
  projectName: string;
  projectSlug?: string;
  agentRole: string;
  variant?: "full" | "compact";
}) {
  const [status, setStatus] = useState<ApprovalStatus>(approval.status);
  const resolved = status !== "pending";

  return (
    <article
      className={[
        "panel p-6 transition-opacity",
        resolved ? "opacity-70" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-serif text-xl leading-snug">{approval.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 meta">
            <span>
              {projectSlug ? (
                <Link
                  href={`/projects/${projectSlug}`}
                  className="hover:text-charcoal"
                >
                  {projectName}
                </Link>
              ) : (
                projectName
              )}
            </span>
            <span aria-hidden>·</span>
            <span>Requested by {agentRole}</span>
            <span aria-hidden>·</span>
            <span>{APPROVAL_TYPE_LABELS[approval.type]}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <StatusTag status={approval.urgency} label={URGENCY_LABELS[approval.urgency]} />
          <StatusTag status={approval.risk} label={RISK_LABELS[approval.risk]} />
        </div>
      </div>

      {variant === "full" ? (
        <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-charcoal/90">
          {approval.summary}
        </p>
      ) : null}

      <div className="mt-4 border-l-2 border-line-strong pl-4">
        <span className="eyebrow">Recommendation</span>
        <p className="mt-1 text-[14.5px] leading-relaxed">
          {approval.recommendation}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {resolved ? (
          <>
            <span className="inline-flex items-center gap-2 text-[13px] text-charcoal">
              <span className="dot bg-olive" />
              {RESOLVED_COPY[status as Exclude<ApprovalStatus, "pending">]}
            </span>
            <button
              type="button"
              className="action-quiet"
              onClick={() => setStatus("pending")}
            >
              Undo
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="action"
              onClick={() => setStatus("approved")}
            >
              Approve
            </button>
            <button
              type="button"
              className="action"
              onClick={() => setStatus("changes_requested")}
            >
              Request changes
            </button>
            <button
              type="button"
              className="action-quiet"
              onClick={() => setStatus("rejected")}
            >
              Reject
            </button>
          </>
        )}
      </div>
    </article>
  );
}
