import type { ActivityKind } from "@/data/mission";

/** Hue per activity kind, used to colour the dot. */
const HUE: Record<ActivityKind, number> = {
  decisão: 265,
  publicação: 210,
  produção: 150,
  investigação: 35,
  memória: 320,
  agente: 175,
};

/** A small coloured status dot, hue derived from the activity kind. */
export default function ActivityDot({ kind }: { kind: ActivityKind }) {
  const hue = HUE[kind] ?? 265;
  return (
    <span
      className="shell-activity-dot"
      style={{ background: `hsla(${hue},65%,60%,0.95)` }}
      aria-hidden
    />
  );
}
