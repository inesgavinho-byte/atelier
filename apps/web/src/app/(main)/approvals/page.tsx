import ApprovalCard from "@/components/ApprovalCard";
import { PageHeader, Section, Empty } from "@/components/ui";
import {
  getAgentById,
  getApprovals,
  getProjectById,
} from "@/lib/data";

export const metadata = { title: "Approvals — ATELIER" };

export default function ApprovalsPage() {
  const all = getApprovals();
  const pending = all.filter((a) => a.status === "pending");

  // Surface the most urgent first.
  const order = { now: 0, soon: 1, later: 2 } as const;
  const sorted = [...pending].sort(
    (a, b) => order[a.urgency] - order[b.urgency]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Decision required"
        title="Approvals"
        lead="Only what requires Inês's judgement. Agents prepare; nothing public ships without approval."
      />

      <Section title="Pending" aside={`${sorted.length} awaiting judgement`}>
        {sorted.length === 0 ? (
          <Empty>Nothing requires judgement right now.</Empty>
        ) : (
          <div className="space-y-4">
            {sorted.map((a) => {
              const project = getProjectById(a.projectId);
              const agent = getAgentById(a.requestedByAgentId);
              return (
                <ApprovalCard
                  key={a.id}
                  approval={a}
                  projectName={project?.name ?? "—"}
                  projectSlug={project?.slug}
                  agentRole={agent?.role ?? "—"}
                  variant="full"
                />
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
