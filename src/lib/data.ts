/**
 * ATELIER — Data access layer
 *
 * This is the single seam between the UI and the data source. Today every
 * reader returns mock data synchronously. To move to Supabase, replace each
 * function body with a query (and make them async) — the call sites already
 * treat these as the source of truth.
 *
 * Future Supabase tables map 1:1 to these readers:
 *   projects, agents, workstreams, approvals, papers,
 *   ideas, principles, decisions, activity (+ memory entries)
 */

import {
  activity,
  agents,
  approvals,
  decisions,
  ideas,
  memoryEntries,
  papers,
  principles,
  projects,
  workstreams,
} from "@/data/mock";
import type {
  Agent,
  Approval,
  ActivityItem,
  Paper,
  Project,
  Workstream,
} from "@/data/types";

export function getProjects(): Project[] {
  return projects;
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function getAgents(): Agent[] {
  return agents;
}

export function getAgentById(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

export function getAgentsForProject(projectId: string): Agent[] {
  const project = getProjectById(projectId);
  if (!project) return [];
  return project.assignedAgentIds
    .map((id) => getAgentById(id))
    .filter((a): a is Agent => Boolean(a));
}

export function getWorkstreamsForProject(projectId: string): Workstream[] {
  return workstreams.filter((w) => w.projectId === projectId);
}

export function getApprovals(): Approval[] {
  return approvals;
}

export function getPendingApprovals(): Approval[] {
  return approvals.filter((a) => a.status === "pending");
}

export function getApprovalsForProject(projectId: string): Approval[] {
  return approvals.filter((a) => a.projectId === projectId);
}

export function getPapers(): Paper[] {
  return papers;
}

export function getPapersForProject(projectId: string): Paper[] {
  return papers.filter((p) => p.projectId === projectId);
}

export function getActivity(): ActivityItem[] {
  return [...activity].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp)
  );
}

export function getActivityForProject(projectId: string): ActivityItem[] {
  return getActivity().filter((a) => a.projectId === projectId);
}

export const memory = {
  ideas,
  principles,
  decisions,
  entries: memoryEntries,
};
