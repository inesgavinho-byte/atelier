"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ConnectorStatus, ConnectorView } from "@/lib/connectors";
import { PROVIDER_META, type ProviderId } from "@/lib/ai/types";
import { saveConnectorCredential } from "@/app/(main)/ecosystem/actions";
import StatusBadge from "@/components/ecosystem/StatusBadge";

function monogram(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ ]/g, "").trim().slice(0, 2).toUpperCase() || "·";
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
  testing: boolean;
  onClose: () => void;
  onTest: () => void;
  onDisconnect: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const meta = PROVIDER_META.find((m) => m.id === (connector.id as ProviderId));

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
              <span className="connector-logo">{monogram(connector.name)}</span>
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
            {!manageable ? (
              <p className="meta">
                Define SUPABASE_SERVICE_ROLE_KEY no ambiente para gerir
                credenciais pela UI. Sem ela, as chaves são lidas das variáveis
                de ambiente.
              </p>
            ) : (
              <>
                {connector.env
                  .filter((e) => e.required)
                  .map((e) => (
                    <div key={e.name} className="drawer-field">
                      <label htmlFor={`d-${e.name}`} className="drawer-label">
                        {e.name}
                        {e.present ? " · configurada" : " · em falta"}
                      </label>
                      <input
                        id={`d-${e.name}`}
                        type="password"
                        autoComplete="off"
                        value={values[e.name] ?? ""}
                        placeholder={e.present ? "•••• (substituir)" : "Colar valor"}
                        onChange={(ev) =>
                          setValues((p) => ({ ...p, [e.name]: ev.target.value }))
                        }
                      />
                    </div>
                  ))}
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
              <p className="meta">Ainda não associado a nenhuma iniciativa.</p>
            )}
          </section>

          {/* Recent activity / errors (no source yet) */}
          <section>
            <p className="drawer-section-title">Atividade recente</p>
            <p className="meta">Sem atividade registada.</p>
          </section>
          <section>
            <p className="drawer-section-title">Erros recentes</p>
            <p className="meta">Sem erros registados.</p>
          </section>
        </div>

        <footer className="connector-drawer-footer">
          <button
            type="button"
            className="connector-button"
            onClick={onTest}
            disabled={testing}
          >
            {testing ? "A testar…" : "Testar ligação"}
          </button>
          {manageable ? (
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
          <Link href="/admin/system" className="connector-button">
            Ver logs
          </Link>
        </footer>
      </aside>
    </>
  );
}
