import { notFound } from "next/navigation";
import Link from "next/link";
import {
  NewProjectForm,
  NewSessionForm,
  WorkspaceAdmin,
} from "@/components/workspaces/WorkspaceForms";
import { ago } from "@/components/mission/bits";
import { getChats, getProjects, getWorkspace } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ws = await getWorkspace(params.workspaceId);
  if (!ws) notFound();

  const [projects, chats] = await Promise.all([
    getProjects(ws.id),
    getChats(ws.id),
  ]);
  const recentChats = chats.slice(0, 6);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <div>
      <Link href="/workspaces" className="action-quiet mb-10 inline-block">
        ← Workspaces
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Workspace{ws.status !== "Ativo" ? ` · ${ws.status}` : ""}</p>
          <h1 className="font-serif text-4xl md:text-5xl">{ws.name}</h1>
          {ws.description ? (
            <p className="meta mt-3 max-w-2xl">{ws.description}</p>
          ) : null}
        </div>
        <WorkspaceAdmin
          workspaceId={ws.id}
          currentName={ws.name}
          archived={ws.status !== "Ativo"}
        />
      </div>

      <div className="mt-14 grid gap-x-12 gap-y-14 lg:grid-cols-2">
        {/* Projects */}
        <section>
          <h2 className="eyebrow mb-5">Projetos</h2>
          {projects.length === 0 ? (
            <p className="meta italic mb-6">Ainda não há projetos.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line mb-6">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/workspaces/${ws.id}/projects/${p.id}`}
                    className="group flex items-baseline justify-between gap-4 py-3"
                  >
                    <span className="text-[15px] text-charcoal transition-colors group-hover:text-olive">
                      {p.name}
                    </span>
                    {p.status !== "Ativo" ? (
                      <span className="meta shrink-0">{p.status}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="panel p-5">
            <p className="eyebrow mb-3">Novo projeto</p>
            <NewProjectForm workspaceId={ws.id} />
          </div>
        </section>

        {/* Recent chats + new chat */}
        <section>
          <h2 className="eyebrow mb-5">Chats recentes</h2>
          {recentChats.length === 0 ? (
            <p className="meta italic mb-6">Ainda não há chats.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line mb-6">
              {recentChats.map((c) => {
                const base = c.projectId
                  ? `/workspaces/${ws.id}/projects/${c.projectId}`
                  : `/workspaces/${ws.id}`;
                return (
                  <li key={c.id}>
                    <Link
                      href={`${base}/chats/${c.id}`}
                      className="group flex items-baseline justify-between gap-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] text-charcoal transition-colors group-hover:text-olive">
                          {c.title}
                        </span>
                        <span className="meta">
                          {c.provider ?? "ATELIER"}
                          {c.projectId
                            ? ` · ${projectName.get(c.projectId) ?? "projeto"}`
                            : ""}
                        </span>
                      </span>
                      <span className="meta shrink-0">{ago(c.updatedAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="panel p-5">
            <p className="eyebrow mb-3">Nova sessão de IA</p>
            <NewSessionForm workspaceId={ws.id} />
          </div>
        </section>
      </div>
    </div>
  );
}
