"use client";

import { useState, useTransition } from "react";
import type { ConnectorView } from "@/lib/connectors";
import { saveConnectorCredential } from "@/app/(main)/ecosystem/actions";

/**
 * Credential modal for a connector. Collects the required values as password
 * fields and saves them server-side. Stored values are never read back into the
 * browser — the modal only ever sends, never shows existing secrets.
 */
export default function CredentialModal({
  connector,
  manageable,
  onClose,
  onSaved,
}: {
  connector: ConnectorView;
  manageable: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const submit = () => {
    setMsg(null);
    start(async () => {
      const r = await saveConnectorCredential(connector.id, values);
      setMsg(r.message);
      if (r.ok) onSaved();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-line-strong bg-cream p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-2xl">Ligar {connector.name}</h2>
          <button type="button" className="action-quiet" onClick={onClose}>
            Fechar
          </button>
        </div>

        {!manageable ? (
          <p className="meta mt-4">
            A gestão de credenciais pela UI requer a variável
            SUPABASE_SERVICE_ROLE_KEY no ambiente do deploy (definida uma única
            vez). Sem ela, as chaves continuam a ser lidas das variáveis de
            ambiente.
          </p>
        ) : (
          <>
            <p className="meta mt-3">
              As credenciais são guardadas de forma segura no servidor e nunca
              são devolvidas ao browser.
            </p>
            <div className="mt-5 grid gap-4">
              {connector.env
                .filter((e) => e.required)
                .map((e) => (
                  <div key={e.name}>
                    <label
                      htmlFor={`cred-${e.name}`}
                      className="eyebrow mb-2 block"
                    >
                      {e.name}
                      {e.present ? " · já configurada" : ""}
                    </label>
                    <input
                      id={`cred-${e.name}`}
                      type="password"
                      autoComplete="off"
                      value={values[e.name] ?? ""}
                      onChange={(ev) =>
                        setValues((p) => ({ ...p, [e.name]: ev.target.value }))
                      }
                      placeholder={e.present ? "•••• (substituir)" : "Colar valor"}
                      className="w-full border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none"
                    />
                  </div>
                ))}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                className="action"
                onClick={submit}
                disabled={saving}
              >
                {saving ? "A guardar…" : "Guardar e ligar"}
              </button>
              {msg ? <span className="meta">{msg}</span> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
