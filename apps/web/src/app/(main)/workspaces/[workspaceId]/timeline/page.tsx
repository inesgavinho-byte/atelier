import { notFound } from "next/navigation";
import Link from "next/link";
import { getInitiativeByIdOrSlug } from "@/lib/mission";
import { getSupabase } from "@/lib/supabase";
import {
  getWorkspaceTimeline,
  syncRepoTimeline,
  syncDeployTimeline,
} from "@/lib/timeline";
import {
  getWorkspaceRepoOverview,
  getWorkspaceNetlifyDeploys,
} from "@/app/(main)/workspaces/[workspaceId]/actions";
import TimelineView from "@/components/workspaces/TimelineView";
import NetlifySiteForm from "@/components/workspaces/NetlifySiteForm";

export const dynamic = "force-dynamic";

/**
 * Workspace Timeline (ADR-0005 Fatia 2 / Bloco F) — every event in the
 * workspace, newest first, filterable by kind. Aggregates the domain tables
 * plus the dedicated timeline_events log, and pulls in GitHub (commits + PRs)
 * and Netlify (deploys) activity on each view.
 */
export default async function WorkspaceTimelinePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ws = await getInitiativeByIdOrSlug(params.workspaceId);
  if (!ws) notFound();

  // Pull recent GitHub + Netlify activity into the timeline first, so it shows
  // alongside everything else. Both idempotent + best-effort.
  const [overview, deploys] = await Promise.all([
    getWorkspaceRepoOverview(ws.id).catch(() => null),
    getWorkspaceNetlifyDeploys(ws.id).catch(() => []),
  ]);
  if (overview) await syncRepoTimeline(ws.id, overview).catch(() => {});
  if (deploys.length) await syncDeployTimeline(ws.id, deploys).catch(() => {});

  // The configured Netlify site (to prefill the setter).
  const sb = getSupabase();
  const { data: wsRow } = sb
    ? await sb
        .from("workspaces")
        .select("netlify_site_id")
        .eq("id", ws.id)
        .maybeSingle()
    : { data: null };
  const netlifySite = (wsRow?.netlify_site_id as string | null) ?? null;

  const events = await getWorkspaceTimeline(ws.id);

  return (
    <div className="ws-page">
      <Link
        href={`/workspaces/${ws.slug ?? ws.id}`}
        className="action-quiet mb-6 inline-block"
      >
        ← {ws.name}
      </Link>

      <header className="ws-header">
        <p className="eyebrow mb-2">Timeline</p>
        <h1 className="ws-header-title">{ws.name}</h1>
        <p className="ws-header-intent">
          A memória cronológica do workspace — tudo o que aconteceu, do mais
          recente ao mais antigo.
        </p>
      </header>

      <TimelineView events={events} />

      <NetlifySiteForm workspaceId={ws.id} current={netlifySite} />
    </div>
  );
}
