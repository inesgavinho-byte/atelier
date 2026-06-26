import Link from "next/link";
import { PageHeader, StatusTag } from "@/components/ui";
import {
  getAgentsForProject,
  getPendingApprovals,
  getProjects,
} from "@/lib/data";
import { PROJECT_STATUS_LABELS } from "@/lib/format";

export const metadata = { title: "Projects — ATELIER" };

export default function ProjectsPage() {
  const projects = getProjects();
  const pending = getPendingApprovals();

  return (
    <div>
      <PageHeader
        eyebrow="Workspaces"
        title="Projects"
        lead="The ventures ATELIER operates. PAPERS is the first pilot; the layer is general."
      />

      <div className="divide-y divide-line border-y border-line">
        {projects.map((p) => {
          const agents = getAgentsForProject(p.id);
          const approvals = pending.filter((a) => a.projectId === p.id).length;
          return (
            <Link
              key={p.id}
              href={`/projects/${p.slug}`}
              className="group block py-8 transition-colors"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="font-serif text-3xl tracking-wide transition-colors group-hover:text-olive">
                  {p.name}
                </h2>
                <StatusTag
                  status={p.status}
                  label={PROJECT_STATUS_LABELS[p.status]}
                />
              </div>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
                {p.mission}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-1 meta">
                <span>
                  <span className="text-charcoal">Current focus:</span>{" "}
                  {p.currentFocus}
                </span>
                <span>{agents.length} agents</span>
                <span>
                  {approvals > 0 ? `${approvals} pending approval${approvals > 1 ? "s" : ""}` : "No pending approvals"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
