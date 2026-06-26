import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getActivity, getAgentById, getProjectById } from "@/lib/data";
import { formatTimestamp } from "@/lib/format";

export const metadata = { title: "Activity — ATELIER" };

const KIND_LABELS: Record<string, string> = {
  agent_action: "Agent",
  project_update: "Project",
  approval_created: "Approval",
  approval_resolved: "Approval",
  file_updated: "File",
  publishing: "Publishing",
  research: "Research",
};

export default function ActivityPage() {
  const items = getActivity();

  return (
    <div>
      <PageHeader
        eyebrow="Operational record"
        title="Activity"
        lead="What the agents and projects have done — quiet and chronological."
      />

      <ul className="divide-y divide-line border-t border-line">
        {items.map((item) => {
          const project = item.projectId
            ? getProjectById(item.projectId)
            : undefined;
          const agent = item.agentId ? getAgentById(item.agentId) : undefined;
          return (
            <li key={item.id} className="grid gap-3 py-6 sm:grid-cols-[150px_1fr]">
              <div className="meta">
                <div className="eyebrow">{KIND_LABELS[item.kind] ?? "Event"}</div>
                <div className="mt-1">{formatTimestamp(item.timestamp)}</div>
              </div>
              <div>
                <h3 className="text-[15px] text-charcoal">{item.title}</h3>
                <p className="meta mt-1">{item.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 meta">
                  {project ? (
                    <Link
                      href={`/projects/${project.slug}`}
                      className="hover:text-charcoal"
                    >
                      {project.name}
                    </Link>
                  ) : null}
                  {agent ? <span>{agent.role}</span> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
