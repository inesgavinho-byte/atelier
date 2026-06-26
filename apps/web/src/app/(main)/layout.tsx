import MissionChrome from "@/components/mission/MissionChrome";
import { getSearchCorpus } from "@/lib/mission";

/**
 * Mission Control shell.
 *
 * There is no persistent feature-sidebar: navigation emerges from the work
 * itself. The only persistent affordances are global search and universal
 * capture, both held in a quiet masthead (see MissionChrome).
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MissionChrome corpus={getSearchCorpus()}>{children}</MissionChrome>;
}
