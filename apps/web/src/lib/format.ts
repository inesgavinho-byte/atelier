/**
 * Presentation helpers — label maps and small formatters.
 * Kept separate from data so the vocabulary lives in one place.
 */

import type {
  AgentStatus,
  ApprovalType,
  ProjectStatus,
  RiskLevel,
  Urgency,
  WorkstreamStatus,
} from "@/data/types";

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  active: "Active",
  running: "Running",
  waiting: "Waiting approval",
  review: "In review",
  not_connected: "Not connected",
  planned: "Planned",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  incubating: "Incubating",
  paused: "Paused",
  strategic: "Strategic",
};

export const WORKSTREAM_STATUS_LABELS: Record<WorkstreamStatus, string> = {
  active: "Active",
  blocked: "Blocked",
  queued: "Queued",
  done: "Done",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  now: "Now",
  soon: "Soon",
  later: "Later",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  publish_paper: "Publish Paper",
  publish_linkedin: "Publish LinkedIn post",
  design_direction: "Design direction",
  site_deployment: "Site deployment",
  strategic_change: "Strategic change",
  agent_autonomy: "Agent autonomy",
};

/** Format an ISO timestamp as a quiet, editorial date+time. */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
