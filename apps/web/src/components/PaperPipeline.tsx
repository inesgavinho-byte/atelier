import { PAPER_STAGES } from "@/data/types";
import type { Paper } from "@/data/types";

/**
 * The PAPERS editorial pipeline. Renders the ordered stages and places each
 * issue at its current stage — a calm operating view of where work stands.
 */
export default function PaperPipeline({ papers }: { papers: Paper[] }) {
  const byStage = new Map<string, Paper[]>();
  for (const p of papers) {
    byStage.set(p.stage, [...(byStage.get(p.stage) ?? []), p]);
  }

  return (
    <div className="space-y-px overflow-hidden border border-line bg-line">
      {PAPER_STAGES.map((stage) => {
        const items = byStage.get(stage) ?? [];
        const empty = items.length === 0;
        return (
          <div
            key={stage}
            className="grid grid-cols-1 gap-2 bg-cream px-5 py-4 sm:grid-cols-[160px_1fr]"
          >
            <div className="flex items-center gap-2">
              <span
                className={`dot ${empty ? "bg-line-strong" : "bg-olive"}`}
                aria-hidden
              />
              <span
                className={`text-[13px] ${empty ? "text-muted" : "text-charcoal"}`}
              >
                {stage}
              </span>
            </div>
            <div>
              {empty ? (
                <span className="meta italic">—</span>
              ) : (
                <ul className="space-y-1">
                  {items.map((p) => (
                    <li key={p.id} className="text-[14px]">
                      <span className="text-charcoal">
                        {p.issue} — {p.title}
                      </span>
                      <span className="meta block">{p.centralDistinction}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
