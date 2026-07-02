/**
 * ATELIER — Mission Control data access
 *
 * The single seam between the Mission Control UI and its data source. Data now
 * lives in the "Atelier" Supabase project (real source) — readers query it and
 * map rows to the domain types. Documents stay as markdown files (the Canon),
 * so the search corpus pulls them from their registries, not the database.
 *
 * All readers are async. The pages that use them are dynamic.
 */

import "server-only";
import { cache } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  type ActivityEvent,
  type Agent,
  type Artifact,
  type Decision,
  type Initiative,
  type Objective,
  type Priority,
} from "@/data/mission";
import { getDocs } from "@/lib/atelier-docs";
import { getProductDocs } from "@/lib/product-docs";
import { getReadings } from "@/lib/readings";
import {
  getAllChats,
  getAllProjects,
  getWorkspaces,
} from "@/lib/workspaces";

const PRIORITY_RANK: Record<Priority, number> = { alta: 0, média: 1, baixa: 2 };

/* ── Row mappers (snake_case → domain types) ─────────────────────────────── */

const toInitiative = (r: any): Initiative => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  intent: r.intent,
  progress: r.progress,
  focus: r.focus,
  agentIds: r.agent_ids ?? [],
  githubRepo: r.github_repo ?? undefined,
  supabaseUrl: r.supabase_url ?? undefined,
  supabaseProjectId: r.supabase_project_id ?? undefined,
  isMain: Boolean(r.is_main),
});

const toAgent = (r: any): Agent => ({
  id: r.id,
  role: r.role,
  office: r.office,
  provider: r.provider,
  state: r.state,
  workspaceId: r.workspace_id ?? undefined,
  mission: r.mission,
  currentTask: r.current_task,
  priority: r.priority ?? "média",
  autonomy: r.autonomy,
  progress: r.progress,
  lastEvent: r.last_event,
  lastEventAt: r.last_event_at,
});

const toDecision = (r: any): Decision => ({
  id: r.id,
  title: r.title,
  kind: r.kind,
  priority: r.priority,
  workspaceId: r.workspace_id,
  agentId: r.agent_id,
  context: r.context,
  impact: r.impact,
  recommendation: r.recommendation,
  status: r.status,
});

const toObjective = (r: any): Objective => ({
  id: r.id,
  title: r.title,
  workspaceId: r.workspace_id,
  status: r.status,
  progress: r.progress,
  risk: r.risk ?? undefined,
});

const toActivity = (r: any): ActivityEvent => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  workspaceId: r.workspace_id ?? undefined,
  agentId: r.agent_id ?? undefined,
  at: r.at,
});

const toArtifact = (r: any): Artifact => ({
  id: r.id,
  title: r.title,
  kind: r.kind,
  workspaceId: r.workspace_id,
  state: r.state,
  updatedAt: r.updated_at,
  revision: r.revision ?? 1,
});

/* ── Initiatives ─────────────────────────────────────────────────────────── */

// Per-request memoised: the layout, the search corpus and individual pages all
// read initiatives within one render — cache() collapses them to one query.
export const getInitiatives = cache(getInitiativesUncached);
async function getInitiativesUncached(): Promise<Initiative[]> {
  const sb = getSupabase();
  if (!sb) return [];
  // Deterministic, complete ordering: sort first, then name as a stable
  // tie-breaker (many rows share the same sort value), so every workspace
  // always appears in a predictable position in the sidebar.
  const { data } = await sb
    .from("workspaces")
    .select("*")
    .order("sort", { nullsFirst: false })
    .order("name");
  return (data ?? []).map(toInitiative);
}

export async function getInitiative(
  slug: string
): Promise<Initiative | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data } = await sb
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data ? toInitiative(data) : undefined;
}

export async function getInitiativeByIdOrSlug(
  idOrSlug: string
): Promise<Initiative | undefined> {
  return (await getInitiativeById(idOrSlug)) ?? (await getInitiative(idOrSlug));
}

/* ── Agents ──────────────────────────────────────────────────────────────── */

export const getAgents = cache(getAgentsUncached);
async function getAgentsUncached(): Promise<Agent[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("agents")
    .select("*")
    .order("sort");
  return (data ?? []).map(toAgent);
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data } = await sb
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? toAgent(data) : undefined;
}

export async function getAgentsForInitiative(id: string): Promise<Agent[]> {
  const ini = await getInitiativeById(id);
  if (!ini || ini.agentIds.length === 0) return [];
  const all = await getAgents();
  const byId = new Map(all.map((a) => [a.id, a]));
  return ini.agentIds
    .map((aid) => byId.get(aid))
    .filter((a): a is Agent => Boolean(a));
}

export async function getInitiativeById(
  id: string
): Promise<Initiative | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data } = await sb
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? toInitiative(data) : undefined;
}

/* ── Decisions ───────────────────────────────────────────────────────────── */

export const getDecisions = cache(getDecisionsUncached);
async function getDecisionsUncached(): Promise<Decision[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("decisions")
    .select("*")
    .order("sort");
  return (data ?? []).map(toDecision);
}

export async function getPendingDecisions(): Promise<Decision[]> {
  const all = await getDecisions();
  return all
    .filter((d) => d.status === "pendente")
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

export async function getDecision(id: string): Promise<Decision | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data } = await sb
    .from("decisions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? toDecision(data) : undefined;
}

export async function getDecisionsForInitiative(
  id: string
): Promise<Decision[]> {
  return (await getPendingDecisions()).filter((d) => d.workspaceId === id);
}

/* ── Objectives ──────────────────────────────────────────────────────────── */

export const getObjectives = cache(getObjectivesUncached);
async function getObjectivesUncached(): Promise<Objective[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("objectives")
    .select("*")
    .order("sort");
  return (data ?? []).map(toObjective);
}

export async function getObjectivesAtRisk(): Promise<Objective[]> {
  return (await getObjectives()).filter((o) => o.status === "em risco");
}

export async function getObjectivesForInitiative(
  id: string
): Promise<Objective[]> {
  return (await getObjectives()).filter((o) => o.workspaceId === id);
}

/* ── Activity ────────────────────────────────────────────────────────────── */

export async function getActivity(): Promise<ActivityEvent[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("activity")
    .select("*")
    .order("at", { ascending: false });
  return (data ?? []).map(toActivity);
}

export async function getActivityForInitiative(
  id: string
): Promise<ActivityEvent[]> {
  return (await getActivity()).filter((e) => e.workspaceId === id);
}

/* ── Artifacts ───────────────────────────────────────────────────────────── */

export const getArtifacts = cache(getArtifactsUncached);
async function getArtifactsUncached(): Promise<Artifact[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("artifacts")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []).map(toArtifact);
}

export async function getArtifactsForInitiative(
  id: string
): Promise<Artifact[]> {
  return (await getArtifacts()).filter((a) => a.workspaceId === id);
}

/* ── Derived figures + config ────────────────────────────────────────────── */

/**
 * The highest-impact pending decision to act on next, derived from real data:
 * a pending publication first, otherwise the highest-priority pending decision.
 * Returns null when nothing is pending.
 */
export async function getNextAction(): Promise<{
  label: string;
  rationale: string;
  decisionId: string;
} | null> {
  const pending = await getPendingDecisions();
  if (!pending.length) return null;
  const pick = pending.find((d) => d.kind === "publicação") ?? pending[0];
  return {
    label: pick.title,
    rationale:
      pick.recommendation ||
      pick.impact ||
      "Decisão pendente de maior prioridade.",
    decisionId: pick.id,
  };
}

export interface RecentWorkItem {
  id: string;
  title: string;
  type: "artifact" | "chat";
  /** Initiative (for artifacts) or workspace (for chats) name, if known. */
  context?: string;
  updatedAt: string;
  href: string;
}

/**
 * The most recent things worked on — artifacts and workspace chats merged and
 * sorted by last update. Each source is isolated so one failing never blanks
 * the whole section.
 */
export async function getRecentWork(limit = 3): Promise<RecentWorkItem[]> {
  const [artifacts, chats, initiatives, workspaces] = await Promise.all([
    getArtifacts().catch(() => []),
    getAllChats().catch(() => []),
    getInitiatives().catch(() => []),
    getWorkspaces().catch(() => []),
  ]);
  const iniById = new Map(initiatives.map((i) => [i.id, i]));
  const wsById = new Map(workspaces.map((w) => [w.id, w]));

  const items: RecentWorkItem[] = [];
  for (const a of artifacts.slice(0, limit)) {
    const ini = iniById.get(a.workspaceId);
    items.push({
      id: a.id,
      title: a.title,
      type: "artifact",
      context: ini?.name,
      updatedAt: a.updatedAt,
      href: ini ? `/workspaces/${ini.slug}` : "/workspaces",
    });
  }
  for (const c of chats.slice(0, limit)) {
    const base = c.projectId
      ? `/workspaces/${c.workspaceId}/projects/${c.projectId}`
      : `/workspaces/${c.workspaceId}`;
    items.push({
      id: c.id,
      title: c.title,
      type: "chat",
      context: wsById.get(c.workspaceId)?.name,
      updatedAt: c.updatedAt,
      href: `${base}/chats/${c.id}`,
    });
  }

  return items
    .sort((x, y) => (y.updatedAt ?? "").localeCompare(x.updatedAt ?? ""))
    .slice(0, limit);
}

/** Today's date as a capitalised European-Portuguese label (no fixed date). */
export function getTodayLabel(): string {
  const s = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function getTodaySummary() {
  const [decisions, agents, objectives, initiatives] = await Promise.all([
    getDecisions(),
    getAgents(),
    getObjectives(),
    getInitiatives(),
  ]);
  return {
    decisions: decisions.filter((d) => d.status === "pendente").length,
    agentsActive: agents.filter((a) => a.state !== "inativo").length,
    initiatives: initiatives.length,
    publications: decisions.filter(
      (d) => d.kind === "publicação" && d.status === "pendente"
    ).length,
    objectivesAtRisk: objectives.filter((o) => o.status === "em risco").length,
    sync: getSupabase() ? "Ligado" : "Local",
  };
}

/* ── Global search corpus ────────────────────────────────────────────────── */

export interface SearchResult {
  group: string;
  label: string;
  detail: string;
  href: string;
}

export async function getSearchCorpus(): Promise<SearchResult[]> {
  // One round-trip wave for the whole corpus (the second group does not depend
  // on the first), so the layout's search index never serialises two waits.
  const [
    initiatives,
    decisions,
    agents,
    artifacts,
    objectives,
    readings,
    workspaces,
    projects,
    chats,
  ] = await Promise.all([
    getInitiatives(),
    getDecisions(),
    getAgents(),
    getArtifacts(),
    getObjectives(),
    getReadings().catch(() => []),
    getWorkspaces().catch(() => []),
    getAllProjects().catch(() => []),
    getAllChats().catch(() => []),
  ]);
  const iniById = new Map(initiatives.map((i) => [i.id, i]));
  const out: SearchResult[] = [];

  // Workspaces themselves are added once below (from getWorkspaces); here we
  // only keep the id→slug map for artifact/objective hrefs.
  for (const d of decisions)
    out.push({
      group: "Decisões",
      label: d.title,
      detail: d.recommendation,
      href: `/decisions/${d.id}`,
    });
  for (const a of agents)
    out.push({
      group: "Agentes",
      label: a.role,
      detail: a.currentTask,
      href: `/agents/${a.id}`,
    });
  for (const art of artifacts)
    out.push({
      group: "Artefactos",
      label: art.title,
      detail: `${art.kind} · ${art.state}`,
      href: `/workspaces/${iniById.get(art.workspaceId)?.slug ?? ""}`,
    });
  for (const o of objectives)
    out.push({
      group: "Objetivos",
      label: o.title,
      detail: o.risk ?? o.status,
      href: `/workspaces/${iniById.get(o.workspaceId)?.slug ?? ""}`,
    });
  // Documents come from their real registries (markdown is the source of truth).
  for (const doc of getDocs())
    out.push({
      group: "Constituição",
      label: doc.label,
      detail: doc.id,
      href: `/atelier/${doc.id}`,
    });
  for (const doc of getProductDocs())
    out.push({
      group: "Produto",
      label: doc.label,
      detail: doc.id,
      href: `/product/${doc.id}`,
    });

  // Readings & workspaces (each isolated above — never break search if a table
  // is empty or unavailable).
  const wsById = new Map(workspaces.map((w) => [w.id, w]));
  for (const r of readings)
    out.push({
      group: "Leituras",
      label: r.title || r.url || "Leitura",
      detail: r.tags.join(", ") || r.status,
      href: "/readings",
    });
  for (const w of workspaces)
    out.push({
      group: "Workspaces",
      label: w.name,
      detail: w.description ?? w.status,
      href: `/workspaces/${w.id}`,
    });
  for (const p of projects)
    out.push({
      group: "Projetos (workspace)",
      label: p.name,
      detail: wsById.get(p.workspaceId)?.name ?? "",
      href: `/workspaces/${p.workspaceId}/projects/${p.id}`,
    });
  for (const c of chats)
    out.push({
      group: "Chats",
      label: c.title,
      detail: c.provider ?? "ATELIER",
      href: c.projectId
        ? `/workspaces/${c.workspaceId}/projects/${c.projectId}/chats/${c.id}`
        : `/workspaces/${c.workspaceId}/chats/${c.id}`,
    });

  return out;
}

/* ── Captures (persisted) ────────────────────────────────────────────────── */

export interface Capture {
  id: string;
  kind: string;
  value: string;
  createdAt: string;
}

export async function getRecentCaptures(limit = 5): Promise<Capture[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("captures")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
    return (data ?? []).map((r: any) => ({
    id: r.id,
    kind: r.kind,
    value: r.value,
    createdAt: r.created_at,
  }));
  }
