import AppShell, { type NavSection } from "@/components/app/AppShell";
import { getInitiatives, getSearchCorpus } from "@/lib/mission";
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
  const [corpus, initiatives, unread] = await Promise.all([
    getSearchCorpus(),
    getInitiatives(),
    countUnreadReadings(),
  ]);

  const workspaceHref = (name: string): string => {
    const hit = initiatives.find(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    return hit ? `/initiatives/${hit.slug}` : "/workspaces";
  };

  const workspace = (name: string) => ({
    label: name,
    href: workspaceHref(name),
    initial: name.charAt(0).toUpperCase(),
  });

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
        workspace("PAPERS"),
        workspace("DECIMA"),
        workspace("GAVINHO"),
        workspace("NUDO"),
        { label: "Pessoal", href: workspaceHref("Pessoal"), icon: "♙" },
        { label: "Novo Workspace", href: "/workspaces", icon: "＋" },
      ],
    },
    {
      label: "Caixas de Entrada",
      items: [
        { label: "Leituras", href: "/readings", icon: "▧" },
        { label: "Decisões", href: "/decisions", icon: "✓" },
        { label: "Inbox", href: "/readings", icon: "⌂", badge: unread || undefined },
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
    <AppShell corpus={corpus} sections={sections} gated={gateEnabled()}>
      {children}
    </AppShell>
  );
}
