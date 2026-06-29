import { notFound } from "next/navigation";
import Link from "next/link";
import { Meter } from "@/components/mission/bits";
import {
  getAgentsForInitiative,
  getArtifactsForInitiative,
  getDecisions,
  getInitiativeByIdOrSlug,
  getPendingDecisions,
} from "@/lib/mission";
import {
  getCanonicalChat,
  getMessages,
  getProjects,
  getWorkspaceContext,
} from "@/lib/workspaces";
import WorkspaceChat from "@/components/workspaces/WorkspaceChat";
import WorkspaceTitle from "@/components/workspaces/WorkspaceTitle";
import ContextPanel from "@/components/workspaces/ContextPanel";
import ImportContext from "@/components/workspaces/ImportContext";
import WorkspaceProjects from "@/components/workspaces/WorkspaceProjects";
import { getWorkspaceRepoOverview } from "@/app/(main)/workspaces/[workspaceId]/actions";

export const dynamic = "force-dynamic";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ws = await getInitiativeByIdOrSlug(params.workspaceId);
  if (!ws) notFound();

  const [
    allDecisions,
    pending,
    artifacts,
    agents,
    context,
    canonical,
    projects,
    overview,
  ] = await Promise.all([
    getDecisions(),
    getPendingDecisions(),
    getArtifactsForInitiative(ws.id),
    getAgentsForInitiative(ws.id),
    getWorkspaceContext(ws.id),
    getCanonicalChat(ws.id),
    getProjects(ws.id),
    getWorkspaceRepoOverview(ws.id).catch(() => null),
  ]);

  const pendingCount = pending.filter((d) => d.workspaceId === ws.id).length;

  // Decisions for this workspace, pending first then the rest.
  const wsDecisions = allDecisions
    .filter((d) => d.workspaceId === ws.id)
    .sort((a, b) => {
      const ap = a.status === "pendente" ? 0 : 1;
      const bp = b.status === "pendente" ? 0 : 1;
      return ap - bp;
    });

  // Read-only load of the canonical chat's history for the initial render. We
  // never create the chat here — sending the first message does that. Uses the
  // shared getCanonicalChat so this matches exactly the chat the send action
  // writes to (continuous, persistent conversation).
  const history = canonical ? await getMessages(canonical.id) : [];
  const initial = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      model: m.model,
      taskType: m.taskType,
      tokens: m.tokens ?? null,
      citations: (m.metadata?.citations as string[]) ?? [],
      steps: (m.metadata?.steps as { action: string; why: string; effort: "S" | "M" | "L" }[]) ?? [],
      debate: (m.metadata?.debate as { provider: string; label: string; model: string; text: string }[]) ?? [],
    }));

  return (
    <div className="ws-page">
      <Link href="/workspaces" className="action-quiet mb-6 inline-block">
        ← Workspaces
      </Link>

      <header className="ws-header">
        <WorkspaceTitle workspaceId={ws.id} name={ws.name} intent={ws.intent} />
        <div className="ws-header-meta">
          <div className="ws-header-progress">
            <Meter value={ws.progress} />
            <span className="ws-header-progress-label">{ws.progress}%</span>
          </div>
          <Link href="/decisions" className="ws-header-chip">
            {pendingCount}{" "}
            {pendingCount === 1 ? "decisão pendente" : "decisões pendentes"}
          </Link>
          <ImportContext
            workspaceId={ws.id}
            workspaceName={ws.name}
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
      </header>

      <WorkspaceProjects
        workspaceId={ws.id}
        workspaceSlug={ws.slug ?? ws.id}
        projects={projects}
      />

      <div className="ws-layout">
        <WorkspaceChat
          key={ws.id}
          workspaceId={ws.id}
          workspaceName={ws.name}
          initialMessages={initial}
          contextVersion={context?.version}
          contextUpdatedAt={context?.lastUpdatedAt}
        />
        <ContextPanel
          workspaceId={ws.id}
          githubRepo={ws.githubRepo}
          supabaseUrl={ws.supabaseUrl}
          context={context}
          decisions={wsDecisions}
          artifacts={artifacts}
          agents={agents}
          overview={overview}
        />
      </div>
    </div>
  );
}
