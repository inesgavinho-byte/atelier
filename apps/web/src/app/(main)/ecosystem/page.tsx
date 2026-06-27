import EcosystemBoard from "@/components/ecosystem/EcosystemBoard";
import { getConnectorViews } from "@/lib/connector-status";

export const dynamic = "force-dynamic";

/**
 * Ecossistema — the connector utility page.
 *
 * Lists every external tool ATELIER can connect to, grouped by category, with
 * credential-based status and a live "test connection" per connector. No
 * secrets are sent to the browser — only whether each variable is present.
 */
export default function EcosystemPage() {
  const connectors = getConnectorViews();
  const configured = connectors.filter((c) => c.status === "Ligado").length;
  const missing = connectors.filter(
    (c) => c.status === "Credenciais em falta"
  ).length;

  return (
    <div>
      <header className="mb-12">
        <p className="atelier-date">Ferramentas</p>
        <h1 className="atelier-title">Ecossistema</h1>
        <p className="atelier-subtitle">
          As ferramentas externas que o ATELIER pode usar. {configured}{" "}
          configuradas · {missing} com credenciais em falta.
        </p>
      </header>

      <EcosystemBoard connectors={connectors} />
    </div>
  );
}
