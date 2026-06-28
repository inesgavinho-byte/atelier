import "server-only";
import { fetchWithTimeout, readEnv } from "@/lib/ai/providers/http";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";

/**
 * ATELIER — GitHub per workspace (server-only).
 *
 * Read-only views of a workspace's repository: open PRs, recent commits and the
 * latest CI run. Every call uses GITHUB_TOKEN (env or the connector store) and
 * runs server-side — the token never reaches the browser. Results are cached in
 * memory for 5 minutes so the GitHub API is not hit on every render.
 */

export interface RepoPR {
  number: number;
  title: string;
  author: string;
  createdAt: string;
  url: string;
}

export interface RepoCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export type CIState = "success" | "failure" | "pending" | "unknown";

export interface RepoCI {
  state: CIState;
  label: string;
  url?: string;
  branch?: string;
}

export interface RepoOverview {
  repo: string;
  url: string;
  prs: RepoPR[];
  commits: RepoCommit[];
  ci: RepoCI | null;
}

const REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/** Whether a string is a valid "owner/repo" identifier. */
export function isValidRepo(repo: string): boolean {
  return REPO_RE.test(repo.trim());
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "atelier-workspace",
  };
}

async function ghGet<T>(
  path: string,
  token: string
): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.github.com${path}`,
      { headers: ghHeaders(token) },
      12000
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Open pull requests (most recent first), capped at `limit`. */
export async function getRepoPRs(
  repo: string,
  token: string,
  limit = 3
): Promise<RepoPR[]> {
  const data = await ghGet<any[]>(
    `/repos/${repo}/pulls?state=open&sort=created&direction=desc&per_page=${limit}`,
    token
  );
  if (!Array.isArray(data)) return [];
  return data.slice(0, limit).map((p) => ({
    number: p.number,
    title: p.title ?? "(sem título)",
    author: p.user?.login ?? "—",
    createdAt: p.created_at ?? "",
    url: p.html_url ?? `https://github.com/${repo}/pull/${p.number}`,
  }));
}

/** Recent commits on the default branch, capped at `limit`. */
export async function getRepoCommits(
  repo: string,
  token: string,
  limit = 3
): Promise<RepoCommit[]> {
  const data = await ghGet<any[]>(
    `/repos/${repo}/commits?per_page=${limit}`,
    token
  );
  if (!Array.isArray(data)) return [];
  return data.slice(0, limit).map((c) => ({
    sha: (c.sha ?? "").slice(0, 7),
    message: (c.commit?.message ?? "").split("\n")[0] || "(sem mensagem)",
    author:
      c.author?.login ?? c.commit?.author?.name ?? "—",
    date: c.commit?.author?.date ?? "",
    url: c.html_url ?? `https://github.com/${repo}/commit/${c.sha}`,
  }));
}

/** Status of the most recent CI (Actions) run. */
export async function getRepoCIStatus(
  repo: string,
  token: string
): Promise<RepoCI | null> {
  const data = await ghGet<{ workflow_runs?: any[] }>(
    `/repos/${repo}/actions/runs?per_page=1`,
    token
  );
  const run = data?.workflow_runs?.[0];
  if (!run) return null;

  // GitHub: status ∈ queued|in_progress|completed; conclusion (when completed)
  // ∈ success|failure|cancelled|… Map both onto a simple traffic-light state.
  let state: CIState = "unknown";
  let label = "Desconhecido";
  if (run.status !== "completed") {
    state = "pending";
    label = "Em execução";
  } else if (run.conclusion === "success") {
    state = "success";
    label = "Verde";
  } else if (
    run.conclusion === "failure" ||
    run.conclusion === "timed_out" ||
    run.conclusion === "startup_failure"
  ) {
    state = "failure";
    label = "Vermelho";
  } else {
    state = "unknown";
    label = run.conclusion ?? "Desconhecido";
  }

  return {
    state,
    label,
    url: run.html_url,
    branch: run.head_branch ?? undefined,
  };
}

/* ── In-memory cache (5 min) ─────────────────────────────────────────────── */

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; data: RepoOverview }>();

/** Resolve GITHUB_TOKEN from the env or the connector credential store. */
async function resolveToken(): Promise<string | undefined> {
  let token = readEnv("GITHUB_TOKEN");
  if (token) return token;
  await hydrateCredentialOverrides();
  token = readEnv("GITHUB_TOKEN");
  return token || undefined;
}

/**
 * The combined repository overview, cached for 5 minutes per repo. Returns null
 * when the repo is invalid or no token is configured; individual sections
 * degrade to empty on API failure (never throws).
 */
export async function getRepoOverview(
  repo: string
): Promise<RepoOverview | null> {
  const clean = repo.trim();
  if (!isValidRepo(clean)) return null;

  const hit = cache.get(clean);
  // Date.now is fine here — server-only, not inside a Workflow script.
  const now = Date.now();
  if (hit && now - hit.at < TTL_MS) return hit.data;

  const token = await resolveToken();
  if (!token) return null;

  const [prs, commits, ci] = await Promise.all([
    getRepoPRs(clean, token),
    getRepoCommits(clean, token),
    getRepoCIStatus(clean, token),
  ]);

  const data: RepoOverview = {
    repo: clean,
    url: `https://github.com/${clean}`,
    prs,
    commits,
    ci,
  };
  cache.set(clean, { at: now, data });
  return data;
}
