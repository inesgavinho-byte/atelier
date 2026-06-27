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
}

export interface Artifact {
  id: string;
  title: string;
  kind: ArtifactKind;
  initiativeId: string;
  state: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  title: string;
  kind: DecisionKind;
  priority: Priority;
  initiativeId: string;
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
  /** the agent's permanent mission (distinct from the current task) */
  mission: string;
  currentTask: string;
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
  initiativeId: string;
  status: ObjectiveStatus;
  progress: number;
  /** present when status === "em risco" */
  risk?: string;
}

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  initiativeId?: string;
  agentId?: string;
  at: string;
}

// ── App constants (no data source yet) ───────────────────────────────────

/**
 * The highest-impact recommendation. Still a constant — there is no engine
 * computing it yet (a candidate for a future, real source).
 */
export const nextAction = {
  label: "Aprovar a publicação do Issue 005 do PAPERS",
  rationale:
    "Desbloqueia o lançamento do site e o anúncio. É a ação de maior impacto hoje.",
  decisionId: "dec-issue-005",
};

export const owner = "Inês";
export const todayLabel = "Sexta-feira, 26 de Junho";

/** Mocked: there is no backend sync this sprint. */
export const syncStatus = "Local";

export const captureKinds: { kind: CaptureKind; label: string }[] = [
  { kind: "texto", label: "Texto" },
  { kind: "áudio", label: "Áudio" },
  { kind: "imagem", label: "Imagem" },
  { kind: "pdf", label: "PDF" },
  { kind: "url", label: "URL" },
  { kind: "email", label: "Email" },
  { kind: "nota", label: "Nota rápida" },
];
