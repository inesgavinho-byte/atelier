"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CATEGORY_ORDER,
  type ConnectorStatus,
  type ConnectorView,
} from "@/lib/connectors";
import { testConnector } from "@/app/(main)/ecosystem/actions";

/** Restrained dot colour per status — calm, not a SaaS traffic light. */
const STATUS_COLOR: Record<ConnectorStatus, string> = {
  Ligado: "#8B8670",
  Erro: "#9b3f32",
  "Credenciais em falta": "#ADAA96",
  "Em teste": "#beb5a4",
  "Não ligado": "#ADAA96",
};

function StatusPill({ status }: { status: ConnectorStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] text-charcoal">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: STATUS_COLOR[status] }}
      />
      {status}
    </span>
  );
}

interface Runtime {
  status: ConnectorStatus;
  message?: string;
  lastChecked?: string;
  testing: boolean;
}

export default function EcosystemBoard({
  connectors,
}: {
  connectors: ConnectorView[];
}) {
  const [runtime, setRuntime] = useState<Record<string, Runtime>>(() =>
    Object.fromEntries(
      connectors.map((c) => [
        c.id,
        {
          status: c.status,
          message: c.message,
          lastChecked: c.lastChecked,
          testing: false,
        },
      ])
    )
  );
  const [disconnectNote, setDisconnectNote] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const runTest = (id: string) => {
    setRuntime((prev) => ({
      ...prev,
      [id]: { ...prev[id], testing: true, status: "Em teste" },
    }));
    startTransition(async () => {
      const r = await testConnector(id);
      setRuntime((prev) => ({
        ...prev,
        [id]: {
          status: r.status,
          message: r.message,
          lastChecked: r.lastChecked,
          testing: false,
        },
      }));
    });
  };

  return (
    <div className="space-y-14">
      {CATEGORY_ORDER.map((category) => {
        const items = connectors.filter((c) => c.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="eyebrow mb-5">{category}</h2>
            <div className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2">
              {items.map((c) => {
                const rt = runtime[c.id];
                return (
                  <div key={c.id} className="bg-cream p-6">
                    <div className="flex items-baseline justify-between gap-4">
                      <Link
                        href={`/ecosystem/${c.id}`}
                        className="font-serif text-2xl text-charcoal transition-colors hover:text-olive"
                      >
                        {c.name}
                      </Link>
                      <StatusPill status={rt.status} />
                    </div>

                    <ul className="mt-4 space-y-1">
                      {c.capabilities.map((cap) => (
                        <li key={cap} className="meta">
                          · {cap}
                        </li>
                      ))}
                    </ul>

                    {rt.message ? (
                      <p className="meta mt-4 font-mono text-[11.5px] break-words">
                        {rt.message}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="meta">
                        {rt.lastChecked
                          ? `verificado ${rt.lastChecked}`
                          : "nunca verificado"}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="action"
                        onClick={() => runTest(c.id)}
                        disabled={rt.testing}
                      >
                        {rt.testing ? "A testar…" : "Testar ligação"}
                      </button>
                      <Link href={`/ecosystem/${c.id}`} className="action">
                        Ligar
                      </Link>
                      <button
                        type="button"
                        className="action-quiet"
                        onClick={() =>
                          setDisconnectNote(
                            disconnectNote === c.id ? null : c.id
                          )
                        }
                      >
                        Desligar
                      </button>
                    </div>

                    {disconnectNote === c.id ? (
                      <p className="meta mt-3">
                        As credenciais são geridas nas variáveis de ambiente do
                        deploy. Remove-as aí para desligar este conector.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
