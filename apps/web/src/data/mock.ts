/**
 * ATELIER — Mock data layer
 *
 * Structured, typed seed data for Sprint 001. No network, no LLM calls.
 *
 * To migrate to Supabase later: create tables matching these shapes (see
 * `src/data/types.ts`), then replace the readers in `src/lib/data.ts` with
 * Supabase queries. Nothing else in the UI references this file directly.
 */

import type {
  Agent,
  ActivityItem,
  Approval,
  Decision,
  Idea,
  MemoryEntry,
  Paper,
  Principle,
  Project,
  Workstream,
} from "@/data/types";

// ── Agents (Team) ─────────────────────────────────────────────────────────

export const agents: Agent[] = [
  {
    id: "agent-editorial-director",
    role: "Editorial Director",
    provider: "OpenAI · GPT",
    status: "active",
    responsibility:
      "Strategy, thesis development, critique and editorial judgement.",
    currentTask: "Sharpening the central distinction of Issue 004.",
    autonomy: 3,
    lastActivity: "12 minutes ago",
    approvalRequired: false,
  },
  {
    id: "agent-research-editor",
    role: "Research Editor",
    provider: "Perplexity",
    status: "waiting",
    responsibility: "Research, sources, genealogy and opposing views.",
    currentTask: "Awaiting direction on Issue 005 investigation.",
    autonomy: 2,
    lastActivity: "1 hour ago",
    approvalRequired: true,
  },
  {
    id: "agent-production",
    role: "Production Agent",
    provider: "Claude Code",
    status: "running",
    responsibility: "Code, repository, Astro/Next, GitHub, Netlify.",
    currentTask: "Building the ATELIER operating layer (Sprint 001).",
    autonomy: 3,
    lastActivity: "Just now",
    approvalRequired: false,
  },
  {
    id: "agent-design-director",
    role: "Design Director",
    provider: "GPT · visual critique",
    status: "review",
    responsibility: "UX, interface, editorial design and typography.",
    currentTask: "Reviewing the PAPERS homepage direction.",
    autonomy: 2,
    lastActivity: "34 minutes ago",
    approvalRequired: true,
  },
  {
    id: "agent-publisher",
    role: "Publisher",
    provider: "Manus · future",
    status: "not_connected",
    responsibility: "LinkedIn, newsletter, campaign, scheduling, analytics.",
    currentTask: "Drafting the Issue 004 announcement, held for approval.",
    autonomy: 1,
    lastActivity: "Yesterday",
    approvalRequired: true,
  },
  {
    id: "agent-observer",
    role: "Observer / Curator",
    provider: "Future",
    status: "planned",
    responsibility:
      "Detects patterns across work — recurring concepts and ideas.",
    currentTask: "Not yet activated.",
    autonomy: 0,
    lastActivity: "—",
    approvalRequired: true,
  },
];

// ── Projects ────────────────────────────────────────────────────────────────

export const projects: Project[] = [
  {
    id: "project-papers",
    slug: "papers",
    name: "PAPERS",
    mission:
      "An editorial institution examining architecture as a condition for inhabited life.",
    status: "active",
    currentFocus: "Issue 004 — The Appearance and the Function",
    assignedAgentIds: [
      "agent-editorial-director",
      "agent-research-editor",
      "agent-production",
      "agent-design-director",
      "agent-publisher",
    ],
  },
  {
    id: "project-decima",
    slug: "decima",
    name: "DECIMA",
    mission:
      "An evolving ontology for structuring knowledge, relationships and meaning.",
    status: "incubating",
    currentFocus: "Ontology evolution — relationship primitives",
    assignedAgentIds: ["agent-editorial-director", "agent-observer"],
  },
  {
    id: "project-gavinho",
    slug: "gavinho",
    name: "GAVINHO",
    mission:
      "The strategic memory and identity layer across all ventures.",
    status: "strategic",
    currentFocus: "Strategic memory consolidation",
    assignedAgentIds: ["agent-editorial-director", "agent-design-director"],
  },
  {
    id: "project-nudo",
    slug: "nudo",
    name: "NUDO",
    mission:
      "A hospitality platform translating spatial humanism into lived experience.",
    status: "incubating",
    currentFocus: "Hospitality platform — concept architecture",
    assignedAgentIds: ["agent-editorial-director"],
  },
  {
    id: "project-personal",
    slug: "personal",
    name: "Personal",
    mission: "Future ventures, private notes and long-horizon thinking.",
    status: "paused",
    currentFocus: "Holding space for what comes next",
    assignedAgentIds: [],
  },
];

// ── Workstreams ───────────────────────────────────────────────────────────

export const workstreams: Workstream[] = [
  {
    id: "ws-papers-004",
    projectId: "project-papers",
    title: "Issue 004 — final edit",
    status: "active",
    detail: "Tightening the distinction between formal and functional innovation.",
  },
  {
    id: "ws-papers-site",
    projectId: "project-papers",
    title: "Homepage direction",
    status: "blocked",
    detail: "Awaiting judgement on editorial homepage layout.",
  },
  {
    id: "ws-papers-distribution",
    projectId: "project-papers",
    title: "Issue 004 distribution",
    status: "queued",
    detail: "LinkedIn announcement and newsletter held until publication.",
  },
  {
    id: "ws-papers-005",
    projectId: "project-papers",
    title: "Issue 005 — research",
    status: "queued",
    detail: "Investigation brief pending direction.",
  },
  {
    id: "ws-decima-ontology",
    projectId: "project-decima",
    title: "Ontology — relationship primitives",
    status: "active",
    detail: "Defining how concepts relate before scaling the model.",
  },
  {
    id: "ws-gavinho-memory",
    projectId: "project-gavinho",
    title: "Strategic memory consolidation",
    status: "active",
    detail: "Gathering canon, principles and decisions into one layer.",
  },
  {
    id: "ws-nudo-concept",
    projectId: "project-nudo",
    title: "Concept architecture",
    status: "queued",
    detail: "Translating spatial humanism into a hospitality model.",
  },
];

// ── PAPERS pipeline ───────────────────────────────────────────────────────

export const papers: Paper[] = [
  {
    id: "paper-000",
    issue: "Issue 000",
    title: "The Architectural Project of We",
    centralDistinction: "Architecture ≠ Service",
    stage: "Distributed",
    projectId: "project-papers",
  },
  {
    id: "paper-001",
    issue: "Issue 001",
    title: "On Inhabited Time",
    centralDistinction: "Architecture = Time",
    stage: "Published",
    projectId: "project-papers",
  },
  {
    id: "paper-002",
    issue: "Issue 002",
    title: "The Architecture of the Interval",
    centralDistinction: "Interval ≠ Transition",
    stage: "Published",
    projectId: "project-papers",
  },
  {
    id: "paper-003",
    issue: "Issue 003",
    title: "A New Spatial Humanism",
    centralDistinction: "Depth ≠ Emptiness",
    stage: "Editing",
    projectId: "project-papers",
  },
  {
    id: "paper-004",
    issue: "Issue 004",
    title: "The Appearance and the Function",
    centralDistinction: "Formal Innovation ≠ Functional Innovation",
    stage: "Approved",
    projectId: "project-papers",
    note: "Awaiting publication approval after final homepage review.",
  },
];

// ── Approvals ───────────────────────────────────────────────────────────────

export const approvals: Approval[] = [
  {
    id: "approval-paper-004",
    title: "Approve Paper 004 publication",
    type: "publish_paper",
    projectId: "project-papers",
    requestedByAgentId: "agent-editorial-director",
    risk: "medium",
    urgency: "now",
    summary:
      "Issue 004 — The Appearance and the Function is edited and approved internally. Publication is the last gate.",
    recommendation: "Approve after final homepage review.",
    status: "pending",
    createdAt: "2026-06-26T08:40:00Z",
  },
  {
    id: "approval-homepage-direction",
    title: "Review homepage direction",
    type: "design_direction",
    projectId: "project-papers",
    requestedByAgentId: "agent-design-director",
    risk: "low",
    urgency: "now",
    summary:
      "Proposed editorial homepage favours a single distinction per issue over a feed of articles.",
    recommendation: "Request one more refinement before committing.",
    status: "pending",
    createdAt: "2026-06-26T07:10:00Z",
  },
  {
    id: "approval-linkedin-announcement",
    title: "Approve LinkedIn announcement",
    type: "publish_linkedin",
    projectId: "project-papers",
    requestedByAgentId: "agent-publisher",
    risk: "medium",
    urgency: "soon",
    summary:
      "Draft announcement for Issue 004 prepared by the Publisher, ready to schedule.",
    recommendation: "Hold until Paper 004 is live.",
    status: "pending",
    createdAt: "2026-06-25T16:25:00Z",
  },
  {
    id: "approval-decima-sprint",
    title: "Decide next DECIMA ontology sprint",
    type: "strategic_change",
    projectId: "project-decima",
    requestedByAgentId: "agent-editorial-director",
    risk: "low",
    urgency: "later",
    summary:
      "Two candidate directions for the next ontology sprint: relationship primitives or temporal modelling.",
    recommendation: "Begin with relationship primitives.",
    status: "pending",
    createdAt: "2026-06-24T11:00:00Z",
  },
  {
    id: "approval-site-deploy",
    title: "Approve PAPERS site deployment",
    type: "site_deployment",
    projectId: "project-papers",
    requestedByAgentId: "agent-production",
    risk: "low",
    urgency: "soon",
    summary:
      "Production build of the PAPERS site is ready to deploy to the editorial domain.",
    recommendation: "Approve once Issue 004 is published.",
    status: "pending",
    createdAt: "2026-06-26T09:05:00Z",
  },
];

// ── Memory: ideas, principles, decisions, entries ───────────────────────────

export const ideas: Idea[] = [
  { id: "idea-time", label: "Time" },
  { id: "idea-attention", label: "Attention" },
  { id: "idea-presence", label: "Presence" },
  { id: "idea-memory", label: "Memory" },
  { id: "idea-responsibility", label: "Responsibility" },
  { id: "idea-spatial-humanism", label: "Spatial Humanism" },
  { id: "idea-mental-sovereignty", label: "Mental Sovereignty" },
  { id: "idea-inhabited-time", label: "Inhabited Time" },
  { id: "idea-interval", label: "The Interval" },
  { id: "idea-domestic-archetype", label: "Domestic Archetype" },
];

export const principles: Principle[] = [
  {
    id: "principle-condition",
    label: "Architecture as Condition",
    note: "Architecture sets the conditions for life, not its services.",
  },
  {
    id: "principle-sovereignty",
    label: "Mental Sovereignty",
    note: "Protect the integrity of thought and attention.",
  },
  {
    id: "principle-attention",
    label: "Integrity of Attention",
    note: "Surface only what requires judgement.",
  },
  {
    id: "principle-archetype",
    label: "Domestic Archetype + Contemporary Envelope",
    note: "Timeless interior logic inside a present-day form.",
  },
  {
    id: "principle-relationships",
    label: "Knowledge Lives in Relationships",
    note: "Meaning emerges between concepts, not within them.",
  },
];

export const decisions: Decision[] = [
  {
    id: "decision-not-brand",
    statement: "PAPERS is not a personal brand.",
    date: "2026-05-02",
  },
  {
    id: "decision-institution",
    statement: "PAPERS is an editorial institution.",
    date: "2026-05-02",
  },
  {
    id: "decision-operating-layer",
    statement: "ATELIER is the operating layer.",
    date: "2026-05-18",
  },
  {
    id: "decision-publishing-approval",
    statement: "Inês approves public publishing.",
    date: "2026-05-18",
  },
  {
    id: "decision-no-autonomous-publish",
    statement: "Agents may prepare but not publish autonomously yet.",
    date: "2026-05-18",
  },
];

export const memoryEntries: MemoryEntry[] = [
  {
    id: "mem-thinking-004",
    kind: "thinking",
    title: "Formal vs functional innovation",
    excerpt:
      "A new appearance is not a new function. Issue 004 turns on holding these apart.",
    date: "2026-06-24",
    projectId: "project-papers",
  },
  {
    id: "mem-canon-interval",
    kind: "canon",
    title: "The Interval is not a transition",
    excerpt:
      "Canonical distinction established in Issue 002 — the interval has its own integrity.",
    date: "2026-03-11",
    projectId: "project-papers",
  },
  {
    id: "mem-reference-humanism",
    kind: "reference",
    title: "Sources on spatial humanism",
    excerpt:
      "Genealogy of humanist spatial thought assembled by the Research Editor.",
    date: "2026-04-02",
    projectId: "project-papers",
  },
  {
    id: "mem-conversation-decima",
    kind: "conversation",
    title: "DECIMA ontology — opening dialogue",
    excerpt:
      "Early exchange on whether relationships precede entities in the model.",
    date: "2026-05-29",
    projectId: "project-decima",
  },
  {
    id: "mem-artifact-site",
    kind: "artifact",
    title: "PAPERS homepage prototype",
    excerpt: "First production build of the editorial homepage.",
    date: "2026-06-20",
    projectId: "project-papers",
  },
];

// ── Activity feed ─────────────────────────────────────────────────────────

export const activity: ActivityItem[] = [
  {
    id: "act-1",
    kind: "agent_action",
    title: "Editorial Director sharpened Issue 004",
    detail: "Refined the central distinction between appearance and function.",
    projectId: "project-papers",
    agentId: "agent-editorial-director",
    timestamp: "2026-06-26T09:48:00Z",
  },
  {
    id: "act-2",
    kind: "approval_created",
    title: "Site deployment approval requested",
    detail: "Production Agent prepared the PAPERS build for deployment.",
    projectId: "project-papers",
    agentId: "agent-production",
    timestamp: "2026-06-26T09:05:00Z",
  },
  {
    id: "act-3",
    kind: "approval_created",
    title: "Paper 004 publication submitted for approval",
    detail: "Editorial Director marked Issue 004 ready for publication.",
    projectId: "project-papers",
    agentId: "agent-editorial-director",
    timestamp: "2026-06-26T08:40:00Z",
  },
  {
    id: "act-4",
    kind: "agent_action",
    title: "Design Director proposed homepage direction",
    detail: "One distinction per issue, rather than a feed of articles.",
    projectId: "project-papers",
    agentId: "agent-design-director",
    timestamp: "2026-06-26T07:10:00Z",
  },
  {
    id: "act-5",
    kind: "research",
    title: "Research Editor compiled humanism sources",
    detail: "Genealogy and opposing views for spatial humanism assembled.",
    projectId: "project-papers",
    agentId: "agent-research-editor",
    timestamp: "2026-06-25T15:20:00Z",
  },
  {
    id: "act-6",
    kind: "publishing",
    title: "Publisher drafted Issue 004 announcement",
    detail: "LinkedIn announcement prepared and held for approval.",
    projectId: "project-papers",
    agentId: "agent-publisher",
    timestamp: "2026-06-25T16:25:00Z",
  },
  {
    id: "act-7",
    kind: "project_update",
    title: "DECIMA ontology sprint scoped",
    detail: "Two candidate directions identified for the next sprint.",
    projectId: "project-decima",
    agentId: "agent-editorial-director",
    timestamp: "2026-06-24T11:00:00Z",
  },
  {
    id: "act-8",
    kind: "file_updated",
    title: "PAPERS homepage prototype committed",
    detail: "First production build of the editorial homepage.",
    projectId: "project-papers",
    agentId: "agent-production",
    timestamp: "2026-06-20T18:30:00Z",
  },
];

// Today's focus / next recommended action surfaced on Home.
export const todaysFocus =
  "Bring Issue 004 to publication — resolve the homepage direction, then release.";

export const nextRecommendedAction = {
  label: "Review homepage direction",
  href: "/approvals",
};
