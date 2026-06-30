/**
 * ATELIER — Mission Control domain types & app constants
 *
 * The operational entities (initiatives, agents, decisions, objectives,
 * activity, artifacts, captures) now live in the "Atelier" Supabase project
 * and are read through `src/lib/mission.ts`. This file keeps only the shared
 * types and the few presentation constants that have no data source yet.
 */

// ── Enums ────────────────────────────────────────────────────────────────

export type Priority = "alta" | "média" | "baixa";

export type DecisionKind =
  | "publicação"
  | "direção"
  | "estratégia"
  | "deployment"
  | "autonomia";

export type DecisionStatus =
  | "pendente"
  | "aprovada"
  | "rejeitada"
  | "adiada"
  | "revisão";

export type AgentState =
  | "em execução"
  | "a aguardar"
  | "em revisão"
  | "inativo";

export type ObjectiveStatus = "em risco" | "a decorrer" | "concluído";

export type ActivityKind =
  | "decisão"
  | "publicação"
  | "produção"
  | "investigação"
  | "memória"
  | "agente";

export type CaptureKind =
  | "texto"
  | "áudio"
  | "imagem"
  | "pdf"
  | "url"
  | "email"
  | "nota";

export type ArtifactKind =
  | "documento"
  | "paper"
  | "código"
  | "imagem"
  | "página"
  | "nota";

// ── Entities ──────────────────────────────────────────────────────────────

export interface Initiative {
  id: string;
  slug: string;
  name: string;
  intent: string;
  /** 0–100 */
  progress: number;
  focus: string;
  /** ids referencing Agent.id */
  agentIds: string[];
  /** Associated GitHub repository, "owner/repo" (optional). */
  githubRepo?: string;
  /** Per-workspace Supabase project URL (non-secret; keys live encrypted). */
  supabaseUrl?: string;
  /** Per-workspace Supabase project ref/id (non-secret). */
  supabaseProjectId?: string;
}

export interface Artifact {
  id: string;
  title: string;
  kind: ArtifactKind;
  workspaceId: string;
  state: string;
  updatedAt: string;
  /** Current revision number (Living Artifacts). */
  revision: number;
}

export interface Decision {
  id: string;
  title: string;
  kind: DecisionKind;
  priority: Priority;
  workspaceId: string;
  agentId: string;
  context: string;
  impact: string;
  recommendation: string;
  status: DecisionStatus;
}

export interface Agent {
  id: string;
  role: string;
  office: string;
  provider: string;
  state: AgentState;
  /** the agent's "home" workspace (direct link); agents can serve several */
  workspaceId?: string;
  /** the agent's permanent mission (distinct from the current task) */
  mission: string;
  currentTask: string;
  /** operator-set supervision priority */
  priority: Priority;
  /** 0–5 */
  autonomy: number;
  /** 0–100, only meaningful while working */
  progress: number;
  lastEvent: string;
  lastEventAt: string;
}

export interface Objective {
  id: string;
  title: string;
  workspaceId: string;
  status: ObjectiveStatus;
  progress: number;
  /** present when status === "em risco" */
  risk?: string;
}

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  workspaceId?: string;
  agentId?: string;
  at: string;
}

// ── App constants ─────────────────────────────────────────────────────────

/** The single operator of this ATELIER. */
export const owner = "Inês";

export const captureKinds: { kind: CaptureKind; label: string }[] = [
  { kind: "texto", label: "Texto" },
  { kind: "áudio", label: "Áudio" },
  { kind: "imagem", label: "Imagem" },
  { kind: "pdf", label: "PDF" },
  { kind: "url", label: "URL" },
  { kind: "email", label: "Email" },
  { kind: "nota", label: "Nota rápida" },
];
