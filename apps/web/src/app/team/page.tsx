import { PageHeader, StatusTag } from "@/components/ui";
import { getAgents } from "@/lib/data";
import { AGENT_STATUS_LABELS } from "@/lib/format";
import { AUTONOMY_LABELS } from "@/data/types";

export const metadata = { title: "Team — ATELIER" };

export default function TeamPage() {
  const agents = getAgents();

  return (
    <div>
      <PageHeader
        eyebrow="Agents"
        title="Team"
        lead="Roles first, models second. Each agent works within an autonomy level. Public-facing actions always require approval."
      />

      <div className="grid gap-px bg-line border border-line md:grid-cols-2">
        {agents.map((a) => (
          <article key={a.id} className="bg-cream p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl">{a.role}</h2>
                <p className="meta mt-1">{a.provider}</p>
              </div>
              <StatusTag status={a.status} label={AGENT_STATUS_LABELS[a.status]} />
            </div>

            <p className="mt-4 text-[14.5px] leading-relaxed text-muted">
              {a.responsibility}
            </p>

            <div className="mt-5 border-l-2 border-line-strong pl-4">
              <div className="eyebrow mb-1">Current task</div>
              <p className="text-[14px]">{a.currentTask}</p>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="eyebrow mb-1">Autonomy</dt>
                <dd className="text-[13.5px]">
                  Level {a.autonomy} · {AUTONOMY_LABELS[a.autonomy]}
                </dd>
              </div>
              <div>
                <dt className="eyebrow mb-1">Approval</dt>
                <dd className="text-[13.5px]">
                  {a.approvalRequired ? "Required" : "Not required"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="eyebrow mb-1">Last activity</dt>
                <dd className="text-[13.5px]">{a.lastActivity}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {/* Autonomy ladder reference */}
      <section className="mt-16">
        <h2 className="eyebrow mb-5">Autonomy ladder</h2>
        <ol className="divide-y divide-line border-y border-line">
          {(Object.entries(AUTONOMY_LABELS) as [string, string][]).map(
            ([level, label]) => (
              <li
                key={level}
                className="flex items-baseline gap-5 py-3 text-[14px]"
              >
                <span className="font-serif text-xl text-olive w-8">{level}</span>
                <span className="text-charcoal">{label}</span>
              </li>
            )
          )}
        </ol>
        <p className="meta mt-4 italic">
          Today: all public-facing actions require approval. The Production Agent
          may execute internal code tasks. The Publisher may only draft and
          request approval.
        </p>
      </section>
    </div>
  );
}
