import "server-only";
import { readEnv } from "@/lib/ai/providers/http";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";

/**
 * Read-only view of a Netlify site's recent deploys, for the workspace Timeline
 * (Bloco F). Uses NETLIFY_AUTH_TOKEN (env or the connector store) server-side —
 * the token never reaches the browser. Returns [] on any failure / no token.
 */

export interface NetlifyDeploy {
  id: string;
  state: string; // 'ready' | 'building' | 'error' | 'new' | …
  branch: string | null;
  title: string | null;
  url: string | null;
  createdAt: string;
}

/** Resolve NETLIFY_AUTH_TOKEN from the env or the connector credential store. */
async function resolveToken(): Promise<string | undefined> {
  let token = readEnv("NETLIFY_AUTH_TOKEN");
  if (token) return token;
  await hydrateCredentialOverrides();
  token = readEnv("NETLIFY_AUTH_TOKEN");
  return token || undefined;
}

export async function getSiteDeploys(
  siteId: string,
  limit = 15
): Promise<NetlifyDeploy[]> {
  const id = siteId.trim();
  if (!id) return [];
  const token = await resolveToken();
  if (!token) return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${encodeURIComponent(id)}/deploys?per_page=${limit}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!res.ok) return [];
    const data = (await res.json()) as any[];
    return (Array.isArray(data) ? data : []).map((d) => ({
      id: String(d.id),
      state: String(d.state ?? "unknown"),
      branch: d.branch ?? null,
      title: d.title ?? d.commit_ref ?? null,
      url: d.deploy_ssl_url ?? d.deploy_url ?? d.links?.permalink ?? null,
      createdAt: d.created_at ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}
