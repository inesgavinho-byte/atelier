import type { ConnectorStatus } from "@/lib/connectors";

/** Map a connector status to its badge class + label (Portuguese). */
const BADGE: Record<ConnectorStatus, { cls: string; label: string }> = {
  Ligado: { cls: "status-connected", label: "Ligado" },
  "Credenciais em falta": { cls: "status-missing", label: "Credenciais em falta" },
  Erro: { cls: "status-error", label: "Erro" },
  "Em teste": { cls: "status-testing", label: "A testar" },
  "Não ligado": { cls: "status-offline", label: "Offline" },
};

export default function StatusBadge({ status }: { status: ConnectorStatus }) {
  const b = BADGE[status] ?? BADGE["Não ligado"];
  return <span className={`status-badge ${b.cls}`}>{b.label}</span>;
}
