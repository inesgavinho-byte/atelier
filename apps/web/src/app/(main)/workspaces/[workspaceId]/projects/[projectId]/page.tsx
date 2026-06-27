import { notFound } from "next/navigation";
import Link from "next/link";
import { NewSessionForm } from "@/components/workspaces/WorkspaceForms";
import { ago } from "@/components/mission/bits";
import { getChats, getProject, getWorkspace } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: { workspaceId: string; projectId: string };
}) {
  const [ws, project] = await Promise.all([
    getWorkspace(params.workspaceId),
    getProject(params.projectId),
  ]);
  if (!ws || !project) notFound();

  const chats = await getChats(ws.id, project.id);

  return (
    <div>
      <Link
        href={`/workspaces/${ws.id}`}
        className="action-quiet mb-10 inline-block"
      >
        ← {ws.name}
      </Link>

      <p className="eyebrow mb-2">Projeto</p>
      <h1 className="font-serif text-4xl md:text-5xl">{project.name}</h1>
      {project.description ? (
        <p className="meta mt-3 max-w-2xl">{project.description}</p>
      ) : null}

      <section className="mt-12">
        <h2 className="eyebrow mb-5">Chats</h2>
        {chats.length === 0 ? (
          <p className="meta italic mb-6">Ainda não há chats neste projeto.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line mb-6">
            {chats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/workspaces/${ws.id}/projects/${project.id}/chats/${c.id}`}
                  className="group flex items-baseline justify-between gap-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] text-charcoal transition-colors group-hover:text-olive">
                      {c.title}
                    </span>
                    <span className="meta">{c.provider ?? "ATELIER"}</span>
                  </span>
                  <span className="meta shrink-0">{ago(c.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="panel p-5">
          <p className="eyebrow mb-3">Nova sessão de IA</p>
          <NewSessionForm workspaceId={ws.id} projectId={project.id} />
        </div>
      </section>
    </div>
  );
}
