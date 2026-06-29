import AppShell, { type NavSection } from "@/components/shell/AppShell";
import {
  getInitiatives,
  getPendingDecisions,
  getSearchCorpus,
} from "@/lib/mission";
import { getAllProjects } from "@/lib/workspaces";
import { countUnreadReadings } from "@/lib/readings";
import { countPendingSignals } from "@/lib/minions";
import { gateEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Atelier application shell for the whole (main) group.
 *
 * The sidebar is reduced to essential daily entry points, grouped. Secondary
 * surfaces (Projetos, Agenda, Comunicação, Knowledge Library, Mission Control)
 * are not in the sidebar but remain reachable by URL, global search and the
 * Sistema area — their routes are unchanged.
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [corpus, initiatives, projects, unread, pending, pendingSignals] =
    await Promise.all([
      getSearchCorpus(),
      getInitiatives(),
      getAllProjects(),
      countUnreadReadings(),
      getPendingDecisions(),
      countPendingSignals(),
    ]);

  const pendingDecisions = pending.length;

  // Group projects under their workspace, ordered by sort.
  const projectsByWorkspace = new Map<string, typeof projects>();
  for (const p of [...projects].sort((a, b) => a.sort - b.sort)) {
    const list = projectsByWorkspace.get(p.workspaceId) ?? [];
    list.push(p);
    projectsByWorkspace.set(p.workspaceId, list);
  }

  const sections: NavSection[] = [
    {
      items: [
        { label: "Hoje", href: "/", icon: "⌂" },
        { label: "Capturar", action: "capture", icon: "＋" },
        { label: "Pesquisar", action: "search", icon: "⌕" },
      ],
    },
    {
      label: "Workspaces",
      items: [
        // Guard against rows with neither slug nor id (would render
        // /workspaces/null). Link by slug, falling back to id — the route
        // resolves either (getInitiativeByIdOrSlug). Each workspace expands to
        // its projects.
        ...initiatives
          .filter((w) => w.slug || w.id)
          .map((w) => {
            const ref = w.slug ?? w.id;
            const wsProjects = projectsByWorkspace.get(w.id) ?? [];
            const children = [
              ...wsProjects.map((p) => ({
                label: p.name,
                href: `/workspaces/${ref}/projects/${p.id}`,
              })),
              {
                label: "+ Novo projecto",
                href: `/workspaces/${ref}`,
                icon: "+",
              },
            ];
            return {
              label: w.name,
              href: `/workspaces/${ref}`,
              workspace: w.name,
              expandKey: w.id,
              children,
            };
          }),
        { label: "Novo Workspace", href: "/workspaces", icon: "+" },
      ],
    },
    {
      label: "Caixas de entrada",
      items: [
        { label: "Leituras", href: "/readings", icon: "▧" },
        {
          label: "Decisões",
          href: "/decisions",
          icon: "✓",
          badge: pendingDecisions || undefined,
        },
        {
          label: "Inbox",
          href: "/readings",
          icon: "⌂",
          badge: unread || undefined,
        },
      ],
    },
    {
      label: "Ferramentas",
      items: [
        { label: "Ecossistema", href: "/ecosystem", icon: "⌘" },
        { label: "Importar", href: "/import", icon: "↧" },
        { label: "Jobs", href: "/jobs", icon: "▦" },
        {
          label: "Minions",
          href: "/minions",
          icon: "◉",
          badge: pendingSignals || undefined,
        },
        { label: "Sistema", href: "/admin/system", icon: "⚙" },
      ],
    },
  ];

  return (
    <AppShell corpus={corpus} sections={sections} gated={gateEnabled()}>
      {children}
    </AppShell>
  );
}
