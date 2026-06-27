import WorkspacesClient from "@/components/workspaces/WorkspacesClient";
import { getWorkspaces } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

/**
 * Workspaces — sandboxes that hold projects, chats, captures and context.
 * Like ChatGPT/Claude projects, but the context belongs to ATELIER.
 */
export default async function WorkspacesPage() {
  const workspaces = await getWorkspaces();

  return (
    <div>
      <header className="mb-12">
        <p className="atelier-date">Espaços de trabalho</p>
        <h1 className="atelier-title">Workspaces</h1>
        <p className="atelier-subtitle">
          Espaços separados para concentrar projetos, chats e contexto.
        </p>
      </header>

      <WorkspacesClient workspaces={workspaces} />
    </div>
  );
}
