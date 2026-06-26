/**
 * ATELIER — Mission Control data access
 *
 * The single seam between the Mission Control UI and its data source. Today it
 * returns mock data synchronously; later each reader can become a Supabase
 * query without touching the UI. Counts are derived here so the surface stays
 * internally consistent.
 */

import {
  activity,
  agents,
  decisions,
  initiatives,
  objectives,
  nextAction,
  type ActivityEvent,
  type Agent,
  type Decision,
  type Initiative,
  type Objective,
  type Priority,
} from "@/data/mission";

const PRIORITY_RANK: Record<Priority, number> = { alta: 0, média: 1, baixa: 2 };

export function getInitiatives(): Initiative[] {
  return initiatives;
}

export function getInitiative(slug: string): Initiative | undefined {
  return initiatives.find((i) => i.slug === slug);
}

export function getInitiativeById(id: string): Initiative | undefined {
  return initiatives.find((i) => i.id === id);
}

export function getAgents(): Agent[] {
  return agents;
}

export function getAgent(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

/** Pending decisions, highest priority first. */
export function getPendingDecisions(): Decision[] {
  return decisions
    .filter((d) => d.status === "pendente")
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

export function getDecision(id: string): Decision | undefined {
  return decisions.find((d) => d.id === id);
}

export function getObjectives(): Objective[] {
  return objectives;
}

export function getObjectivesAtRisk(): Objective[] {
  return objectives.filter((o) => o.status === "em risco");
}

export function getActivity(): ActivityEvent[] {
  return [...activity].sort((a, b) => b.at.localeCompare(a.at));
}

export function getActivityForInitiative(id: string): ActivityEvent[] {
  return getActivity().filter((e) => e.initiativeId === id);
}

export function getDecisionsForInitiative(id: string): Decision[] {
  return getPendingDecisions().filter((d) => d.initiativeId === id);
}

export function getObjectivesForInitiative(id: string): Objective[] {
  return objectives.filter((o) => o.initiativeId === id);
}

export function getNextAction() {
  return nextAction;
}

/** Derived counts for the "Hoje" band. */
export function getTodaySummary() {
  return {
    decisions: getPendingDecisions().length,
    agentsRunning: agents.filter((a) => a.state === "em execução").length,
    readyToPublish: decisions.filter(
      (d) => d.kind === "publicação" && d.status === "pendente"
    ).length,
    objectivesAtRisk: getObjectivesAtRisk().length,
  };
}

// ── Global search corpus ─────────────────────────────────────────────────

export interface SearchResult {
  group: string;
  label: string;
  detail: string;
  href: string;
}

/** Flatten everything searchable into one corpus. */
export function getSearchCorpus(): SearchResult[] {
  const out: SearchResult[] = [];

  for (const i of initiatives) {
    out.push({
      group: "Iniciativas",
      label: i.name,
      detail: i.focus,
      href: `/initiatives/${i.slug}`,
    });
  }
  for (const d of decisions) {
    out.push({
      group: "Decisões",
      label: d.title,
      detail: d.recommendation,
      href: `/decisions/${d.id}`,
    });
  }
  for (const a of agents) {
    out.push({
      group: "Agentes",
      label: a.role,
      detail: a.currentTask,
      href: `/agents/${a.id}`,
    });
  }
  for (const o of objectives) {
    out.push({
      group: "Objetivos",
      label: o.title,
      detail: o.risk ?? o.status,
      href: `/initiatives/${getInitiativeById(o.initiativeId)?.slug ?? ""}`,
    });
  }
  // Constitutional documents are part of the searchable corpus per EPIC-001.
  for (const doc of [
    { id: "AT-0001", label: "Manifesto" },
    { id: "AT-0002", label: "Operating System" },
    { id: "AT-0003", label: "Organisation" },
    { id: "AT-0004", label: "Product Specification" },
    { id: "AT-0005", label: "Agent Architecture" },
    { id: "AT-0006", label: "Canon" },
    { id: "AT-0009", label: "Ontologia" },
  ]) {
    out.push({
      group: "Constituição",
      label: doc.label,
      detail: doc.id,
      href: `/atelier/${doc.id}`,
    });
  }
  return out;
}
