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

  const primaryNav: NavLink[] = [
    { label: "Atelier", href: "/" },
    { label: "Capturar", action: "capture" },
    { label: "Leituras", href: "/readings" },
    { label: "Workspaces", href: "/workspaces" },
    { label: "PAPERS", href: projectHref("PAPERS") },
    { label: "DECIMA", href: projectHref("DECIMA") },
    { label: "GAVINHO", href: projectHref("GAVINHO") },
    { label: "Projetos", href: "/initiatives", exact: true },
    { label: "Decisões", href: "/decisions" },
    { label: "Knowledge Library", href: "/knowledge" },
    { label: "Agenda", href: "/agenda" },
    { label: "Comunicação", href: "/comunicacao" },
    { label: "Mission Control", href: "/mission" },
  ];

  const footerNav: NavLink[] = [
    { label: "Pesquisar", action: "search" },
    { label: "Ecossistema", href: "/ecosystem" },
    { label: "Configurações", href: "/admin/system" },
  ];

  return (
    <DeskShell corpus={corpus} primaryNav={primaryNav} footerNav={footerNav}>
      {children}
    </DeskShell>
  );
}
