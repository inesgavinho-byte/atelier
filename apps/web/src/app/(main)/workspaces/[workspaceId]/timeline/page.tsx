import { notFound } from "next/navigation";
import Link from "next/link";
import { getInitiativeByIdOrSlug } from "@/lib/mission";
import { getWorkspaceTimeline, syncRepoTimeline } from "@/lib/timeline";
import { getWorkspaceRepoOverview } from "@/app/(main)/workspaces/[workspaceId]/actions";
import TimelineView from "@/components/workspaces/TimelineView";

export const dynamic = "force-dynamic";

/**
 * Workspace Timeline (ADR-0005 Fatia 2) — every event in the workspace, newest
 * first, filterable by kind. Aggregates the domain tables plus the dedicated
 * timeline_events log.
 */
export default async function WorkspaceTimelinePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ws = await getInitiativeByIdOrSlug(params.workspaceId);
  if (!ws) notFound();

  // Pull recent GitHub activity (commits + PRs) into the timeline first, so it
  // shows alongside everything else. Idempotent + best-effort.
  const overview = await getWorkspaceRepoOverview(ws.id).catch(() => null);
  if (overview) await syncRepoTimeline(ws.id, overview).catch(() => {});

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
    </div>
  );
}
