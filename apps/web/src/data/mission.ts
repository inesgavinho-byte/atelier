/**
 * ATELIER — Mission Control mock data
 *
 * Realistic, structured mock data for the Mission Control prototype (Sprint
 * P002). No backend, no Supabase. Vocabulary and fields follow EPIC-001.
 *
 * Counts shown in "Hoje" are derived from this data (see lib/mission.ts), so
 * the surface is always internally consistent.
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

// ── Entities ──────────────────────────────────────────────────────────────

export interface Initiative {
  id: string;
  slug: string;
  name: string;
  intent: string;
  /** 0–100 */
  progress: number;
  focus: string;
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

// ── Initiatives ─────────────────────────────────────────────────────────

export const initiatives: Initiative[] = [
  {
    id: "ini-papers",
    slug: "papers",
    name: "PAPERS",
    intent: "Instituição editorial sobre arquitetura como condição.",
    progress: 72,
    focus: "Issue 005 — em revisão final",
  },
  {
    id: "ini-decima",
    slug: "decima",
    name: "DECIMA",
    intent: "Ontologia evolutiva para estruturar conhecimento.",
    progress: 38,
    focus: "Primitivas de relação",
  },
  {
    id: "ini-gavinho",
    slug: "gavinho",
    name: "GAVINHO",
    intent: "Memória estratégica e identidade transversal.",
    progress: 54,
    focus: "Consolidação de cânone",
  },
  {
    id: "ini-nudo",
    slug: "nudo",
    name: "NUDO",
    intent: "Plataforma de hospitalidade do humanismo espacial.",
    progress: 21,
    focus: "Arquitetura conceptual",
  },
];

// ── Agents ─────────────────────────────────────────────────────────────────

export const agents: Agent[] = [
  {
    id: "agt-editorial",
    role: "Direção Editorial",
    office: "Editorial",
    provider: "GPT",
    state: "em execução",
    currentTask: "Afinar a distinção central do Issue 005.",
    autonomy: 3,
    progress: 68,
    lastEvent: "Reestruturou a tese da secção 2.",
    lastEventAt: "2026-06-26T09:48:00Z",
  },
  {
    id: "agt-research",
    role: "Investigação",
    office: "Research",
    provider: "Perplexity",
    state: "em execução",
    currentTask: "Reunir genealogia e visões opostas para o Issue 005.",
    autonomy: 2,
    progress: 41,
    lastEvent: "Adicionou 6 referências validadas.",
    lastEventAt: "2026-06-26T09:20:00Z",
  },
  {
    id: "agt-production",
    role: "Produção",
    office: "Production",
    provider: "Claude Code",
    state: "em execução",
    currentTask: "Preparar o build do site PAPERS para deployment.",
    autonomy: 3,
    progress: 87,
    lastEvent: "Build de produção concluído.",
    lastEventAt: "2026-06-26T09:05:00Z",
  },
  {
    id: "agt-design",
    role: "Design",
    office: "Design",
    provider: "GPT · crítica visual",
    state: "em revisão",
    currentTask: "Rever direção da homepage editorial.",
    autonomy: 2,
    progress: 50,
    lastEvent: "Propôs uma distinção por número.",
    lastEventAt: "2026-06-26T07:10:00Z",
  },
  {
    id: "agt-comms",
    role: "Comunicação",
    office: "Communications",
    provider: "Manus · futuro",
    state: "a aguardar",
    currentTask: "Anúncio do Issue 005, retido até publicação.",
    autonomy: 1,
    progress: 0,
    lastEvent: "Rascunho preparado, à espera de aprovação.",
    lastEventAt: "2026-06-25T16:25:00Z",
  },
  {
    id: "agt-knowledge",
    role: "Conhecimento",
    office: "Knowledge",
    provider: "Futuro",
    state: "em execução",
    currentTask: "Relacionar recorrências entre os Issues 001–005.",
    autonomy: 2,
    progress: 33,
    lastEvent: "Detetou um padrão sobre o intervalo.",
    lastEventAt: "2026-06-26T08:12:00Z",
  },
];

// ── Decisions ─────────────────────────────────────────────────────────────

export const decisions: Decision[] = [
  {
    id: "dec-issue-005",
    title: "Aprovar a publicação do Issue 005",
    kind: "publicação",
    priority: "alta",
    initiativeId: "ini-papers",
    agentId: "agt-editorial",
    context:
      "O Issue 005 está revisto e aprovado internamente. A publicação é a última porta antes de se tornar público.",
    impact: "Publicação pública sob a marca PAPERS. Irreversível.",
    recommendation: "Aprovar após a revisão final da homepage.",
    status: "pendente",
  },
  {
    id: "dec-homepage",
    title: "Rever a direção da homepage",
    kind: "direção",
    priority: "média",
    initiativeId: "ini-papers",
    agentId: "agt-design",
    context:
      "A homepage proposta privilegia uma distinção por número em vez de um feed de artigos.",
    impact: "Define a leitura editorial do site antes do lançamento.",
    recommendation: "Pedir mais um refinamento antes de fixar.",
    status: "pendente",
  },
  {
    id: "dec-deploy",
    title: "Aprovar o deployment do site PAPERS",
    kind: "deployment",
    priority: "média",
    initiativeId: "ini-papers",
    agentId: "agt-production",
    context: "O build de produção está pronto para o domínio editorial.",
    impact: "Coloca o site no ar. Reversível por rollback.",
    recommendation: "Aprovar depois de o Issue 005 estar publicado.",
    status: "pendente",
  },
  {
    id: "dec-decima-sprint",
    title: "Decidir o próximo sprint de ontologia DECIMA",
    kind: "estratégia",
    priority: "baixa",
    initiativeId: "ini-decima",
    agentId: "agt-editorial",
    context:
      "Dois rumos candidatos: primitivas de relação ou modelação temporal.",
    impact: "Orienta o trabalho de investigação das próximas semanas.",
    recommendation: "Começar pelas primitivas de relação.",
    status: "pendente",
  },
];

// ── Objectives ─────────────────────────────────────────────────────────────

export const objectives: Objective[] = [
  {
    id: "obj-issue-005",
    title: "Publicar o Issue 005",
    initiativeId: "ini-papers",
    status: "em risco",
    progress: 90,
    risk: "Bloqueado pela direção da homepage por decidir.",
  },
  {
    id: "obj-site-papers",
    title: "Lançar o site PAPERS",
    initiativeId: "ini-papers",
    status: "em risco",
    progress: 80,
    risk: "Depende da publicação do Issue 005.",
  },
  {
    id: "obj-decima-ontology",
    title: "Definir primitivas de relação",
    initiativeId: "ini-decima",
    status: "em risco",
    progress: 30,
    risk: "Sem direção aprovada para o próximo sprint.",
  },
  {
    id: "obj-gavinho-canon",
    title: "Consolidar o cânone estratégico",
    initiativeId: "ini-gavinho",
    status: "a decorrer",
    progress: 54,
  },
  {
    id: "obj-nudo-concept",
    title: "Arquitetura conceptual NUDO",
    initiativeId: "ini-nudo",
    status: "a decorrer",
    progress: 21,
  },
];

// ── Activity ─────────────────────────────────────────────────────────────

export const activity: ActivityEvent[] = [
  {
    id: "act-1",
    kind: "agente",
    title: "Direção Editorial afinou a tese do Issue 005.",
    initiativeId: "ini-papers",
    agentId: "agt-editorial",
    at: "2026-06-26T09:48:00Z",
  },
  {
    id: "act-2",
    kind: "produção",
    title: "Build de produção do site PAPERS concluído.",
    initiativeId: "ini-papers",
    agentId: "agt-production",
    at: "2026-06-26T09:05:00Z",
  },
  {
    id: "act-3",
    kind: "decisão",
    title: "Pedida aprovação para publicar o Issue 005.",
    initiativeId: "ini-papers",
    agentId: "agt-editorial",
    at: "2026-06-26T08:40:00Z",
  },
  {
    id: "act-4",
    kind: "memória",
    title: "Detetado um padrão recorrente sobre o intervalo.",
    initiativeId: "ini-papers",
    agentId: "agt-knowledge",
    at: "2026-06-26T08:12:00Z",
  },
  {
    id: "act-5",
    kind: "investigação",
    title: "Investigação adicionou 6 referências validadas.",
    initiativeId: "ini-papers",
    agentId: "agt-research",
    at: "2026-06-25T17:30:00Z",
  },
  {
    id: "act-6",
    kind: "publicação",
    title: "Rascunho do anúncio do Issue 005 preparado.",
    initiativeId: "ini-papers",
    agentId: "agt-comms",
    at: "2026-06-25T16:25:00Z",
  },
  {
    id: "act-7",
    kind: "decisão",
    title: "Sprint de ontologia DECIMA delineado em dois rumos.",
    initiativeId: "ini-decima",
    agentId: "agt-editorial",
    at: "2026-06-24T11:00:00Z",
  },
];

// ── Next action (highest impact) ─────────────────────────────────────────

export const nextAction = {
  label: "Aprovar a publicação do Issue 005 do PAPERS",
  rationale:
    "Desbloqueia o lançamento do site e o anúncio. É a ação de maior impacto hoje.",
  decisionId: "dec-issue-005",
};

// ── Greeting ─────────────────────────────────────────────────────────────

export const owner = "Inês";
export const todayLabel = "Sexta-feira, 26 de Junho";

// ── Capture types ─────────────────────────────────────────────────────────

export const captureKinds: { kind: CaptureKind; label: string }[] = [
  { kind: "texto", label: "Texto" },
  { kind: "áudio", label: "Áudio" },
  { kind: "imagem", label: "Imagem" },
  { kind: "pdf", label: "PDF" },
  { kind: "url", label: "URL" },
  { kind: "email", label: "Email" },
  { kind: "nota", label: "Nota rápida" },
];
