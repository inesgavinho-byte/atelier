"use client";

import { useState, useTransition } from "react";
import type { ConnectorStatus, ConnectorView } from "@/lib/connectors";
import { getEnvHint } from "@/lib/connectors";
import { PROVIDER_META, type ProviderId } from "@/lib/ai/types";
import {
  getConnectorLogs,
  saveConnectorCredential,
  type ConnectorLog,
} from "@/app/(main)/ecosystem/actions";
import StatusBadge from "@/components/ecosystem/StatusBadge";
import ConnectorIcon from "@/components/ecosystem/ConnectorIcon";

const OAUTH_EXPLANATION =
  "Esta integração requer autenticação OAuth — disponível em breve.";

/** Format an ISO timestamp in pt-PT, falling back to the raw value. */
function fmtDate(value: string): string {
  try {
    return new Date(value).toLocaleString("pt-PT");
  } catch {
    return value;
  }
}

/** URL-style credentials (e.g. ICS feeds) are not secret — show them as text. */
function isUrlKey(envKey: string): boolean {
  return /URL$/i.test(envKey) || /_URL/i.test(envKey);
}

/**
 * Right drawer with a connector's full detail. Opens over the page (no
 * navigation). Holds the technical detail removed from the cards: credentials,
 * models, capabilities, usage and the connector actions.
 */
export default function ConnectorDrawer({
  connector,
  status,
  message,
  lastChecked,
  manageable,
  encrypted,
  testing,
  onClose,
  onTest,
  onDisconnect,
  onSaved,
}: {
  connector: ConnectorView;
  status: ConnectorStatus;
  message?: string;
  lastChecked?: string;
  manageable: boolean;
  encrypted: boolean;
  testing: boolean;
  onClose: () => void;
  onTest: () => void;
  onDisconnect: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<ConnectorLog[] | null>(null);
  const [loadingLogs, startLogs] = useTransition();

  const meta = PROVIDER_META.find((m) => m.id === (connector.id as ProviderId));
  const isOAuth = connector.auth === "oauth";

  // A live test only makes sense for testable connectors whose credentials are
  // present. OAuth connectors have no key flow at all, so they cannot be tested.
  const canTest =
    !isOAuth &&
    connector.testable &&
    status !== "Credenciais em falta" &&
    status !== "Não ligado";

  const toggleLogs = () => {
    setShowLogs((prev) => {
      const next = !prev;
      if (next && logs === null) {
        startLogs(async () => {
          const rows = await getConnectorLogs(connector.id);
          setLogs(rows);
        });
      }
      return next;
    });
  };

  const save = () => {
    setSaveMsg(null);
    startSave(async () => {
      const r = await saveConnectorCredential(connector.id, values);
      setSaveMsg(r.message);
      if (r.ok) {
        setValues({});
        onSaved();
      }
    });
  };

  return (
    <>
      <div className="connector-drawer-backdrop" onClick={onClose} />
      <aside
        className="connector-drawer"
        role="dialog"
        aria-label={`Detalhes de ${connector.name}`}
      >
        <header className="connector-drawer-header">
          <div className="connector-drawer-title-row">
            <div className="flex items-start gap-4">
              <span className="connector-logo connector-logo-lg">
                <ConnectorIcon
                  connectorId={connector.id}
                  name={connector.name}
                  size={48}
                />
              </span>
              <div>
                <h2 className="connector-drawer-title">{connector.name}</h2>
                <div className="mt-3">
                  <StatusBadge status={status} />
                </div>
              </div>
            </div>
            <button type="button" className="connector-button" onClick={onClose}>
              Fechar
            </button>
          </div>
          <p className="connector-description">{connector.description}</p>
        </header>

        <div className="connector-drawer-body">
          {/* Credentials */}
          <section>
            <p className="drawer-section-title">Credenciais</p>
            {isOAuth ? (
              <p className="meta">{OAUTH_EXPLANATION}</p>
            ) : !manageable ? (
              <p className="meta">
                Define SUPABASE_SERVICE_ROLE_KEY no ambiente para gerir
                credenciais pela UI. Sem ela, as chaves são lidas das variáveis
                de ambiente.
              </p>
            ) : (
              <>
                {!encrypted ? (
                  <p className="meta drawer-warn mb-3">
                    Sem ATELIER_CRED_KEY as credenciais são guardadas em texto
                    simples — define-a no ambiente para encriptar.
                  </p>
                ) : null}
                {connector.env
                  .filter((e) => e.required)
                  .map((e) => {
                    const url = isUrlKey(e.name);
                    const hint = getEnvHint(e.name);
                    const placeholder =
                      hint?.placeholder ??
                      (url
                        ? e.present
                          ? "https://… (substituir)"
                          : "https://exemplo.com/calendario.ics"
                        : e.present
                          ? "•••• (substituir)"
                          : "Colar valor");
                    return (
                      <div key={e.name} className="drawer-field">
                        <label htmlFor={`d-${e.name}`} className="drawer-label">
                          {e.name}
                          {e.present ? " · configurada" : " · em falta"}
                        </label>
                        <input
                          id={`d-${e.name}`}
                          type={url ? "url" : "password"}
                          autoComplete="off"
                          value={values[e.name] ?? ""}
                          placeholder={placeholder}
                          onChange={(ev) =>
                            setValues((p) => ({ ...p, [e.name]: ev.target.value }))
                          }
                        />
                        {hint?.helper ? (
                          <p className="meta mt-1">{hint.helper}</p>
                        ) : null}
                      </div>
                    );
                  })}
                {saveMsg ? <p className="meta mt-2">{saveMsg}</p> : null}
              </>
            )}
          </section>

          {/* Metadata */}
          <section>
            <p className="drawer-section-title">Detalhes</p>
            <div className="drawer-row">
              <span className="drawer-label">Estado</span>
              <span className="drawer-value">{status}</span>
            </div>
            <div className="drawer-row">
              <span className="drawer-label">Última verificação</span>
              <span className="drawer-value">{lastChecked ?? "nunca"}</span>
            </div>
            {meta ? (
              <div className="drawer-row">
                <span className="drawer-label">Modelo por omissão</span>
                <span className="drawer-value">{meta.defaultModel}</span>
              </div>
            ) : null}
            {message ? (
              <div className="drawer-row">
                <span className="drawer-label">Último resultado</span>
                <span className="drawer-value font-mono text-[12px]">
                  {message}
                </span>
              </div>
            ) : null}
          </section>

          {/* Capabilities */}
          <section>
            <p className="drawer-section-title">Capacidades</p>
            <div className="drawer-chip-list">
              {connector.capabilities.map((c) => (
                <span key={c} className="drawer-chip">
                  {c}
                </span>
              ))}
            </div>
          </section>

          {/* Available models */}
          {meta ? (
            <section>
              <p className="drawer-section-title">Modelos disponíveis</p>
              <div className="drawer-chip-list">
                {meta.models.map((m) => (
                  <span key={m} className="drawer-chip">
                    {m}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* Used in */}
          <section>
            <p className="drawer-section-title">Usado em</p>
            {connector.usedIn?.length ? (
              <div className="drawer-chip-list">
                {connector.usedIn.map((u) => (
                  <span key={u} className="drawer-chip">
                    {u}
                  </span>
                ))}
              </div>
            ) : (
              <p className="meta">Ainda não associado a nenhum workspace.</p>
            )}
          </section>

          {/* Activity log — this connector's credential history (no values) */}
          <section>
            <div className="drawer-row">
              <p className="drawer-section-title">Atividade</p>
              <button
                type="button"
                className="connector-button"
                onClick={toggleLogs}
              >
                {showLogs ? "Ocultar logs" : "Ver logs"}
              </button>
            </div>
            {showLogs ? (
              loadingLogs && logs === null ? (
                <p className="meta">A carregar…</p>
              ) : logs && logs.length ? (
                <ul className="drawer-log-list">
                  {logs.map((l) => (
                    <li key={l.env_key} className="meta font-mono text-[12px]">
                      {l.env_key} · guardada {fmtDate(l.created_at)} · actualizada{" "}
                      {fmtDate(l.updated_at)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="meta">Sem actividade registada.</p>
              )
            ) : null}
          </section>
        </div>

        <footer className="connector-drawer-footer">
          <button
            type="button"
            className="connector-button"
            onClick={onTest}
            disabled={testing || !canTest}
            title={
              isOAuth
                ? "Requer OAuth"
                : !connector.testable
                  ? "Sem teste activo para este conector."
                  : status === "Credenciais em falta"
                    ? "Configura as credenciais primeiro."
                    : undefined
            }
          >
            {testing ? "A testar…" : "Testar ligação"}
          </button>
          {manageable && !isOAuth ? (
            <button
              type="button"
              className="connector-button primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "A guardar…" : "Guardar alterações"}
            </button>
          ) : null}
          <button
            type="button"
            className="connector-button drawer-danger"
            onClick={onDisconnect}
            disabled={testing}
          >
            Desligar
          </button>
        </footer>
      </aside>
    </>
  );
}
