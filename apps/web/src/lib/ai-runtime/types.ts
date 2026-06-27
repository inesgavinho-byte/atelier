/**
 * ATELIER — AI Runtime types & work modes (client-safe).
 *
 * The runtime sits above the AI gateway: it turns a work mode + Skill into the
 * context a session runs with. This file holds no secrets and no fs/network, so
 * the session UI can import the work-mode registry directly.
 */

export interface WorkMode {
  /** URL/storage-safe id. */
  id: string;
  label: string;
  /** Knowledge-Library Skill id, or null for the free mode. */
  skillId: string | null;
}

/** The work modes a session can run in (each binds to a Skill, except Livre). */
export const WORK_MODES: WorkMode[] = [
  { id: "estrategia", label: "Estratégia", skillId: "SKILL-0001" },
  { id: "escrita-editorial", label: "Escrita Editorial", skillId: "SKILL-0002" },
  { id: "investigacao", label: "Investigação", skillId: "SKILL-0003" },
  { id: "decisao", label: "Decisão", skillId: "SKILL-0004" },
  {
    id: "arquitetura-conhecimento",
    label: "Arquitetura de Conhecimento",
    skillId: "SKILL-0005",
  },
  { id: "design-critique", label: "Design Critique", skillId: "SKILL-0006" },
  { id: "sintese", label: "Síntese", skillId: "SKILL-0007" },
  { id: "livre", label: "Livre", skillId: null },
];

export function workMode(id?: string | null): WorkMode | undefined {
  return WORK_MODES.find((m) => m.id === id);
}

export function modeLabel(id?: string | null): string {
  return workMode(id)?.label ?? "Livre";
}

export function skillIdForMode(id?: string | null): string | null {
  return workMode(id)?.skillId ?? null;
}

/* ── Skill context bundle (built server-side, consumed by the runtime) ────── */

export interface KnowledgeExcerpt {
  id: string;
  title: string;
  excerpt: string;
}

export interface SkillBundle {
  skill: { id: string; title: string; body: string };
  principles: KnowledgeExcerpt[];
  mentalModels: KnowledgeExcerpt[];
}

export interface SessionContext {
  workspaceName?: string;
  projectName?: string;
  modeId?: string | null;
}
