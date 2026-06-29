import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getArtifactsForInitiative,
  getAgentsForInitiative,
  getDecisions,
  getInitiativeByIdOrSlug,
} from "@/lib/mission";
import {
  getCanonicalChat,
  getMessages,
  getProject,
  getWorkspaceContext,
} from "@/lib/workspaces";
import WorkspaceChat from "@/components/workspaces/WorkspaceChat";
import ContextPanel from "@/components/workspaces/ContextPanel";
import ImportContext from "@/components/workspaces/ImportContext";

export const dynamic = "force-dynamic";

/**
 * A project's continuous chat (ADR-0005 F1). Mirrors the workspace page: the
 * same chat component and context panel, but scoped to the project — the
 * Council receives both the workspace and the project context, and the right
 * rail shows the project's own memory and repo.
 */
export default async function ProjectDetailPage({
  params,
}: {
  params: { workspaceId: string; projectId: string };
}) {
  const ws = await getInitiativeByIdOrSlug(params.workspaceId);
  if (!ws) notFound();

  const project = await getProject(params.projectId);
  if (!project || project.workspaceId !== ws.id) notFound();

  const [allDecisions, artifacts, agents, context, canonical] =
    await Promise.all([
      getDecisions(),
      getArtifactsForInitiative(ws.id),
      getAgentsForInitiative(ws.id),
      getWorkspaceContext(ws.id, project.id),
      getCanonicalChat(ws.id, project.id),
    ]);

  // Workspace decisions, pending first (shared across the workspace — not yet
  // project-scoped in the schema).
  const wsDecisions = allDecisions
    .filter((d) => d.workspaceId === ws.id)
    .sort((a, b) => {
      const ap = a.status === "pendente" ? 0 : 1;
      const bp = b.status === "pendente" ? 0 : 1;
      return ap - bp;
    });

  // Read-only load of the project's canonical chat history for the first render.
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
    }));

  return (
    <div className="ws-page">
      <Link
        href={`/workspaces/${ws.slug ?? ws.id}`}
        className="action-quiet mb-6 inline-block"
      >
        ← {ws.name}
      </Link>

      <header className="ws-header">
        <p className="eyebrow mb-2">Projecto · {ws.name}</p>
        <h1 className="ws-header-title">{project.name}</h1>
        {project.description ? (
          <p className="ws-header-intent">{project.description}</p>
        ) : null}
        <div className="ws-header-meta">
          <ImportContext
            workspaceId={ws.id}
            projects={[{ id: project.id, name: project.name }]}
            defaultProjectId={project.id}
          />
        </div>
      </header>

      <div className="ws-layout">
        <WorkspaceChat
          key={project.id}
          workspaceId={ws.id}
          workspaceName={project.name}
          projectId={project.id}
          initialMessages={initial}
          contextVersion={context?.version}
          contextUpdatedAt={context?.lastUpdatedAt}
        />
        <ContextPanel
          workspaceId={ws.id}
          projectId={project.id}
          githubRepo={project.githubRepo}
          context={context}
          decisions={wsDecisions}
          artifacts={artifacts}
          agents={agents}
        />
      </div>
    </div>
  );
}
