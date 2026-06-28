import AppShell, { type NavSection } from "@/components/shell/AppShell";
import {
  getInitiatives,
  getPendingDecisions,
  getSearchCorpus,
} from "@/lib/mission";
import { countUnreadReadings } from "@/lib/readings";
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
  const [corpus, initiatives, unread, pending] = await Promise.all([
    getSearchCorpus(),
    getInitiatives(),
    countUnreadReadings(),
    getPendingDecisions(),
  ]);

  const pendingDecisions = pending.length;

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
        ...initiatives.map((w) => ({
          label: w.name,
          href: `/workspaces/${w.slug}`,
          workspace: w.name,
        })),
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
        { label: "Jobs", href: "/jobs", icon: "▦" },
        { label: "Sistema", href: "/admin/system", icon: "⚙" },
      ],
    },
  ];

  return (
    <AppShell
      corpus={corpus}
      sections={sections}
      gated={gateEnabled()}
      pendingDecisions={pendingDecisions}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
