import DeskShell, { type NavLink } from "@/components/desk/DeskShell";
import { getInitiatives, getSearchCorpus } from "@/lib/mission";

export const dynamic = "force-dynamic";

/**
 * Atelier Desk shell for the whole (main) group.
 *
 * The persistent left navigation links to real destinations. The three named
 * projects resolve to their actual initiative slugs from the data; when an
 * initiative is not present yet the link falls back to the projects index, so
 * there are never dead links.
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [corpus, initiatives] = await Promise.all([
    getSearchCorpus(),
    getInitiatives(),
  ]);

  const projectHref = (name: string): string => {
    const hit = initiatives.find(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    return hit ? `/initiatives/${hit.slug}` : "/initiatives";
  };

  // Essential daily entry points only — grouped, separated by thin rules.
  // Technical/secondary surfaces (Projetos, Agenda, Comunicação, Knowledge
  // Library, Mission Control) stay reachable by URL and global search; they are
  // not in the primary sidebar. Their routes are unchanged.
  const navGroups: NavLink[][] = [
    [
      { label: "Hoje", href: "/" },
      { label: "Capturar", action: "capture" },
      { label: "Workspaces", href: "/workspaces" },
    ],
    [
      { label: "PAPERS", href: projectHref("PAPERS") },
      { label: "DECIMA", href: projectHref("DECIMA") },
      { label: "GAVINHO", href: projectHref("GAVINHO") },
    ],
    [
      { label: "Leituras", href: "/readings" },
      { label: "Decisões", href: "/decisions" },
      { label: "Ecossistema", href: "/ecosystem" },
    ],
  ];

  const footerNav: NavLink[] = [
    { label: "Pesquisar", action: "search" },
    {
      label: "Sistema",
      children: [
        { label: "Mission Control", href: "/mission" },
        { label: "Admin / Sistema", href: "/admin/system" },
      ],
    },
  ];

  return (
    <DeskShell corpus={corpus} navGroups={navGroups} footerNav={footerNav}>
      {children}
    </DeskShell>
  );
}
