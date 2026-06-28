import EcosystemBoard from "@/components/ecosystem/EcosystemBoard";
import { getConnectorViews } from "@/lib/connector-status";
import {
  credentialSecurity,
  hydrateCredentialOverrides,
} from "@/lib/credentials-store";

export const dynamic = "force-dynamic";

/**
 * Ecossistema — the connector utility page.
 *
 * Lists every external tool ATELIER can connect to, grouped by category, with
 * credential-based status and a live "test connection" per connector.
 * Credentials are configured from here (stored server-side, encrypted at rest);
 * no secret is ever sent to the browser — only whether each variable is present.
 */
export default async function EcosystemPage() {
  // Resolve stored credentials so status reflects what was saved via the UI.
  await hydrateCredentialOverrides();
  const connectors = getConnectorViews();
  const security = credentialSecurity();
  const configured = connectors.filter((c) => c.status === "Ligado").length;
  const missing = connectors.filter(
    (c) => c.status === "Credenciais em falta"
  ).length;

  return (
    <div className="ecosystem-page">
      <header className="ecosystem-header">
        <h1 className="ecosystem-title">Ecossistema</h1>
        <p className="ecosystem-subtitle">
          {configured} ligadas · {missing} por configurar
        </p>
        {!security.manageable ? (
          <p className="ecosystem-note">
            Para configurar credenciais a partir desta página, define
            SUPABASE_SERVICE_ROLE_KEY no ambiente do deploy. Sem ela, as chaves
            continuam a ser lidas das variáveis de ambiente.
          </p>
        ) : !security.encrypted ? (
          <p className="ecosystem-note">
            Credenciais guardadas em texto simples — define ATELIER_CRED_KEY
            para as encriptar em repouso.
          </p>
        ) : null}
      </header>

      <EcosystemBoard
        connectors={connectors}
        manageable={security.manageable}
      />
    </div>
  );
}
