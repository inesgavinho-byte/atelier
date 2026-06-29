import { notFound } from "next/navigation";
import Link from "next/link";
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
import ContextPanel from "@/components/workspaces/ContextPanel";
import ImportContext from "@/components/workspaces/ImportContext";
import WorkspaceMoreMenu from "@/components/workspaces/WorkspaceMoreMenu";
import WorkspaceSearchPill from "@/components/workspaces/WorkspaceSearchPill";
import { getDocuments } from "@/lib/documents";
import { getSessions } from "@/lib/sessions";
import { getChatIdentity } from "@/lib/profile";
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
    documents,
    sessions,
    chatUser,
  ] = await Promise.all([
    getDecisions(),
    getPendingDecisions(),
    getArtifactsForInitiative(ws.id),
    getAgentsForInitiative(ws.id),
    getWorkspaceContext(ws.id),
    getCanonicalChat(ws.id),
    getProjects(ws.id),
    getWorkspaceRepoOverview(ws.id).catch(() => null),
    getDocuments(ws.id).catch(() => []),
    getSessions(ws.id).catch(() => []),
    getChatIdentity(ws.id),
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
      time: m.createdAt
        ? new Date(m.createdAt).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Lisbon",
          })
        : undefined,
      model: m.model,
      taskType: m.taskType,
      tokens: m.tokens ?? null,
      citations: (m.metadata?.citations as string[]) ?? [],
      sources: (m.metadata?.sources as { documentId: string; documentTitle: string }[]) ?? [],
      steps: (m.metadata?.steps as { action: string; why: string; effort: "S" | "M" | "L" }[]) ?? [],
      debate: (m.metadata?.debate as { provider: string; label: string; model: string; text: string }[]) ?? [],
    }));

  const slug = ws.slug ?? ws.id;

  return (
    <div className="ws-page">
      {/* Compact action bar — the large workspace title now lives only in the
          sidebar and search. Decisões · Timeline · Importar contexto · Mais. */}
      <div className="ws-actionbar">
        <Link href="/decisions" className="ws-pill ws-pill-decisions">
          {pendingCount} {pendingCount === 1 ? "decisão" : "decisões"}
        </Link>
        <Link href={`/workspaces/${slug}/timeline`} className="ws-pill">
          Timeline
        </Link>
        <ImportContext
          workspaceId={ws.id}
          workspaceName={ws.name}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          triggerClassName="ws-pill"
        />
        <WorkspaceMoreMenu
          workspaceId={ws.id}
          name={ws.name}
          intent={ws.intent}
          progress={ws.progress}
        />
        <div className="ws-actionbar-spacer" />
        <WorkspaceSearchPill />
      </div>

      <div className="ws-layout">
        <WorkspaceChat
          key={ws.id}
          workspaceId={ws.id}
          workspaceName={ws.name}
          initialMessages={initial}
          contextVersion={context?.version}
          contextUpdatedAt={context?.lastUpdatedAt}
          artifacts={artifacts.map((a) => ({ id: a.id, title: a.title }))}
          user={chatUser}
        />
        <ContextPanel
          workspaceId={ws.id}
          workspaceSlug={slug}
          githubRepo={ws.githubRepo}
          supabaseUrl={ws.supabaseUrl}
          context={context}
          decisions={wsDecisions}
          artifacts={artifacts}
          agents={agents}
          projects={projects}
          documents={documents}
          sessions={sessions}
          overview={overview}
        />
      </div>
    </div>
  );
}
