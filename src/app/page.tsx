import Link from "next/link";
import ApprovalCard from "@/components/ApprovalCard";
import { PageHeader, Section, StatusTag, CardLink } from "@/components/ui";
import {
  getActivity,
  getAgentById,
  getAgents,
  getPendingApprovals,
  getProjectById,
  getProjects,
} from "@/lib/data";
import { todaysFocus } from "@/data/mock";
import {
  AGENT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  formatTimestamp,
} from "@/lib/format";

export default function HomePage() {
  const approvals = getPendingApprovals();
  const projects = getProjects();
  const agents = getAgents();
  const recent = getActivity().slice(0, 5);

  return (
    <div>
      <PageHeader title="ATELIER" lead="Where thought becomes work." />

      {/* Today's focus */}
      <div className="mb-14 border-l-2 border-charcoal pl-5">
        <div className="eyebrow mb-2">Today&rsquo;s focus</div>
        <p className="max-w-2xl font-serif text-2xl leading-snug text-charcoal">
          {todaysFocus}
        </p>
      </div>

      {/* Requires judgement */}
      <Section
        title="Requires your judgement"
        aside={`${approvals.length} open`}
      >
        <div className="space-y-4">
          {approvals.map((a) => {
            const project = getProjectById(a.projectId);
            const agent = getAgentById(a.requestedByAgentId);
            return (
              <ApprovalCard
                key={a.id}
                approval={a}
                projectName={project?.name ?? "—"}
                projectSlug={project?.slug}
                agentRole={agent?.role ?? "—"}
                variant="compact"
              />
            );
          })}
        </div>
      </Section>

      {/* Active projects */}
      <Section title="Active projects" aside={<Link href="/projects" className="hover:text-charcoal">All projects →</Link>}>
        <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.slug}`}
              className="group border-b border-r border-line bg-cream p-6 transition-colors hover:bg-surface"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-2xl tracking-wide">{p.name}</h3>
                <StatusTag
                  status={p.status}
                  label={PROJECT_STATUS_LABELS[p.status]}
                />
              </div>
              <p className="meta mt-2">{p.currentFocus}</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* Team status */}
      <Section title="Team status" aside={<Link href="/team" className="hover:text-charcoal">Full team →</Link>}>
        <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="border-b border-r border-line bg-cream p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14px] text-charcoal">{agent.role}</span>
                <StatusTag
                  status={agent.status}
                  label={AGENT_STATUS_LABELS[agent.status]}
                />
              </div>
              <p className="meta mt-1">{agent.provider}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Recent activity */}
      <Section title="Recent activity" aside={<Link href="/activity" className="hover:text-charcoal">All activity →</Link>}>
        <ul className="divide-y divide-line">
          {recent.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-6 py-3">
              <span className="text-[14px]">{item.title}</span>
              <span className="meta shrink-0">{formatTimestamp(item.timestamp)}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Next recommended action */}
      <div className="rule mt-2 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow mb-1">Next recommended action</div>
            <p className="font-serif text-xl">Review the homepage direction for PAPERS</p>
          </div>
          <Link href="/approvals" className="action">
            Continue work
          </Link>
        </div>
      </div>
    </div>
  );
}
