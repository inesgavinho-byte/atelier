import type { CognitiveLoad } from "@/lib/cognitive-load";

/**
 * Cognitive Load card (Personal Decimin v2). Display-only: the mental-load
 * band, the open loops behind it, and a single recommendation. Server
 * component — no interactivity.
 */
export default function CognitiveLoadCard({ load }: { load: CognitiveLoad }) {
  const metrics = [
    { label: "Compromissos pendentes", value: load.pendingCommitments },
    { label: "Decisões por decidir", value: load.pendingDecisions },
    { label: "Sessões abertas", value: load.openSessions },
  ];

  return (
    <section className={`cl cl-${load.band}`}>
      <div className="cl-head">
        <span className="cl-eyebrow">Carga cognitiva</span>
        <span className="cl-band">{load.band}</span>
      </div>
      <div className="cl-bar">
        <div className="cl-bar-fill" style={{ width: `${load.score}%` }} />
      </div>
      <div className="cl-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="cl-metric">
            <span className="cl-metric-value">{m.value}</span>
            <span className="cl-metric-label">{m.label}</span>
          </div>
        ))}
      </div>
      <p className="cl-reco">{load.recommendation}</p>
    </section>
  );
}
