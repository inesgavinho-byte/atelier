import { notFound } from "next/navigation";
import Link from "next/link";
import ApprovalCard from "@/components/ApprovalCard";
import PaperPipeline from "@/components/PaperPipeline";
import { PageHeader, Section, StatusTag, Empty } from "@/components/ui";
import {
  getActivityForProject,
  getAgentById,
  getAgentsForProject,
  getApprovalsForProject,
  getPapersForProject,
  getProjectBySlug,
  getProjects,
  getWorkstreamsForProject,
} from "@/lib/data";
import { memory } from "@/lib/data";
import {
  AGENT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  WORKSTREAM_STATUS_LABELS,
  formatTimestamp,
} from "@/lib/format";

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const project = getProjectBySlug(params.slug);
  return { title: project ? `${project.name} — ATELIER` : "Project — ATELIER" };
}

export default function ProjectDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const project = getProjectBySlug(params.slug);
  if (!project) notFound();

  const agents = getAgentsForProject(project.id);
  const workstreams = getWorkstreamsForProject(project.id);
  const approvals = getApprovalsForProject(project.id).filter(
    (a) => a.status === "pending"
  );
  const activity = getActivityForProject(project.id).slice(0, 6);
  const papers = getPapersForProject(project.id);
  const isPapers = project.slug === "papers";

  return (
    <div>
      <Link href="/projects" className="action-quiet mb-8 inline-block">
        ← Projects
      </Link>

      <PageHeader
        eyebrow={PROJECT_STATUS_LABELS[project.status]}
        title={project.name}
        lead={project.mission}
      />

      <div className="mb-14 border-l-2 border-charcoal pl-5">
        <div className="eyebrow mb-2">Current focus</div>
        <p className="max-w-2xl font-serif text-2xl leading-snug">
          {project.currentFocus}
        </p>
      </div>

      {/* PAPERS-specific: pipeline + ideas + principles */}
      {isPapers ? (
        <>
          <Section title="Paper pipeline" aside={`${papers.length} issues`}>
            <PaperPipeline papers={papers} />
          </Section>

          <div className="grid gap-12 md:grid-cols-2">
            <Section title="Ideas">
              <ul className="flex flex-wrap gap-2">
                {memory.ideas.map((idea) => (
                  <li
                    key={idea.id}
                    className="border border-line px-3 py-1 text-[13px] text-charcoal"
                  >
                    {idea.label}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Principles">
              <ul className="space-y-3">
                {memory.principles.map((pr) => (
                  <li key={pr.id}>
                    <div className="text-[14px] text-charcoal">{pr.label}</div>
                    {pr.note ? <p className="meta">{pr.note}</p> : null}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="Distribution & site">
            <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-3">
              {[
                { label: "Current investigation", value: "Issue 004" },
                { label: "Site status", value: "Build ready — awaiting deploy approval" },
                { label: "Distribution", value: "LinkedIn announcement drafted, held" },
              ].map((cell) => (
                <div key={cell.label} className="border-b border-r border-line bg-cream p-5">
                  <div className="eyebrow mb-2">{cell.label}</div>
                  <p className="text-[14px] leading-relaxed">{cell.value}</p>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : null}

      {/* Workstreams */}
      <Section title="Active workstreams">
        {workstreams.length === 0 ? (
          <Empty>No active workstreams.</Empty>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {workstreams.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
              >
                <div className="min-w-0">
                  <div className="text-[15px] text-charcoal">{w.title}</div>
                  <p className="meta">{w.detail}</p>
                </div>
                <StatusTag
                  status={w.status}
                  label={WORKSTREAM_STATUS_LABELS[w.status]}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Assigned agents */}
      <Section title="Assigned agents">
        {agents.length === 0 ? (
          <Empty>No agents assigned yet.</Empty>
        ) : (
          <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2">
            {agents.map((a) => (
              <div key={a.id} className="border-b border-r border-line bg-cream p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px] text-charcoal">{a.role}</span>
                  <StatusTag
                    status={a.status}
                    label={AGENT_STATUS_LABELS[a.status]}
                  />
                </div>
                <p className="meta mt-1">{a.currentTask}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Pending approvals */}
      <Section title="Pending approvals">
        {approvals.length === 0 ? (
          <Empty>Nothing requires judgement here right now.</Empty>
        ) : (
          <div className="space-y-4">
            {approvals.map((a) => {
              const agent = getAgentById(a.requestedByAgentId);
              return (
                <ApprovalCard
                  key={a.id}
                  approval={a}
                  projectName={project.name}
                  agentRole={agent?.role ?? "—"}
                  variant="compact"
                />
              );
            })}
          </div>
        )}
      </Section>

      {/* Recent activity */}
      <Section title="Recent activity">
        {activity.length === 0 ? (
          <Empty>No recent activity.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {activity.map((item) => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-6 py-3"
              >
                <div>
                  <span className="text-[14px]">{item.title}</span>
                  <p className="meta">{item.detail}</p>
                </div>
                <span className="meta shrink-0">
                  {formatTimestamp(item.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
