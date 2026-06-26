/**
 * ATELIER — Domain types
 *
 * These types describe the operating layer. They are intentionally close to
 * what a future Supabase schema would look like: each entity has a stable
 * string `id`, relations are expressed as id references, and enums are kept
 * as string unions so they map cleanly to Postgres enums or text columns.
 *
 * Replacing the mock layer with Supabase later should mean swapping the
 * data source in `src/lib/data.ts` — these types stay the same.
 */

// ── Shared enums ────────────────────────────────────────────────────────────

export type ProjectStatus =
  | "active"
  | "incubating"
  | "paused"
  | "strategic";

export type Urgency = "now" | "soon" | "later";

export type RiskLevel = "low" | "medium" | "high";

/** Agent autonomy ladder. All public-facing actions require approval today. */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  0: "Disabled",
  1: "Draft only",
  2: "Prepare & request approval",
  3: "Execute internal tasks",
  4: "Publish with approval",
  5: "Autonomous publishing",
};

export type AgentStatus =
  | "active"
  | "running"
  | "waiting"
  | "review"
  | "not_connected"
  | "planned";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export type ApprovalType =
  | "publish_paper"
  | "publish_linkedin"
  | "design_direction"
  | "site_deployment"
  | "strategic_change"
  | "agent_autonomy";

/** PAPERS editorial pipeline stages, in order. */
export type PaperStage =
  | "Raw Note"
  | "Thinking"
  | "Research"
  | "Draft"
  | "Editing"
  | "Approved"
  | "Published"
  | "Distributed"
  | "Archived";

export const PAPER_STAGES: PaperStage[] = [
  "Raw Note",
  "Thinking",
  "Research",
  "Draft",
  "Editing",
  "Approved",
  "Published",
  "Distributed",
  "Archived",
];

export type WorkstreamStatus = "active" | "blocked" | "queued" | "done";

export type ActivityKind =
  | "agent_action"
  | "project_update"
  | "approval_created"
  | "approval_resolved"
  | "file_updated"
  | "publishing"
  | "research";

export type MemoryKind =
  | "thinking"
  | "canon"
  | "idea"
  | "principle"
  | "reference"
  | "decision"
  | "conversation"
  | "artifact";

// ── Entities ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  slug: string;
  name: string;
  mission: string;
  status: ProjectStatus;
  currentFocus: string;
  /** ids referencing Agent.id */
  assignedAgentIds: string[];
}

export interface Workstream {
  id: string;
  projectId: string;
  title: string;
  status: WorkstreamStatus;
  detail: string;
}

export interface Agent {
  id: string;
  /** Role is the primary identity — model/provider is secondary. */
  role: string;
  provider: string;
  status: AgentStatus;
  responsibility: string;
  currentTask: string;
  autonomy: AutonomyLevel;
  lastActivity: string;
  approvalRequired: boolean;
}

export interface Approval {
  id: string;
  title: string;
  type: ApprovalType;
  projectId: string;
  requestedByAgentId: string;
  risk: RiskLevel;
  urgency: Urgency;
  summary: string;
  recommendation: string;
  status: ApprovalStatus;
  createdAt: string;
}

export interface Paper {
  id: string;
  issue: string;
  title: string;
  centralDistinction: string;
  stage: PaperStage;
  projectId: string;
  note?: string;
}

export interface Idea {
  id: string;
  label: string;
  note?: string;
}

export interface Principle {
  id: string;
  label: string;
  note?: string;
}

export interface Decision {
  id: string;
  statement: string;
  date: string;
}

export interface MemoryEntry {
  id: string;
  kind: MemoryKind;
  title: string;
  excerpt: string;
  date: string;
  projectId?: string;
}

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  projectId?: string;
  agentId?: string;
  timestamp: string;
}
