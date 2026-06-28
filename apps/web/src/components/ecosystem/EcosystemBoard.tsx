"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CATEGORY_ORDER,
  type ConnectorCategory,
  type ConnectorStatus,
  type ConnectorView,
} from "@/lib/connectors";
import {
  disconnectConnector,
  testConnector,
} from "@/app/(main)/ecosystem/actions";
import StatusBadge from "@/components/ecosystem/StatusBadge";
import ConnectorDrawer from "@/components/ecosystem/ConnectorDrawer";
import ConnectorIcon from "@/components/ecosystem/ConnectorIcon";

const SESSION_PROVIDERS = new Set(["openai", "claude", "perplexity"]);

interface Runtime {
  status: ConnectorStatus;
  message?: string;
  lastChecked?: string;
  testing: boolean;
}

export default function EcosystemBoard({
  connectors,
  manageable,
}: {
  connectors: ConnectorView[];
  manageable: boolean;
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
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"Todas" | ConnectorCategory>("Todas");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const runTest = (id: string) => {
    setOpenMenu(null);
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

  const runDisconnect = (id: string) => {
    setOpenMenu(null);
    setRuntime((prev) => ({
      ...prev,
      [id]: { ...prev[id], testing: true, status: "Em teste" },
    }));
    startTransition(async () => {
      const r = await disconnectConnector(id);
      const after = await testConnector(id);
      setRuntime((prev) => ({
        ...prev,
        [id]: {
          status: after.status,
          message: r.message,
          lastChecked: after.lastChecked,
          testing: false,
        },
      }));
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return connectors.filter((c) => {
      if (tab !== "Todas" && c.category !== tab) return false;
      if (q) {
        const hay = `${c.name} ${c.description} ${c.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [connectors, query, tab]);

  const drawer = connectors.find((c) => c.id === drawerId) ?? null;

  const renderCard = (c: ConnectorView) => {
    const rt = runtime[c.id];
    const usable = SESSION_PROVIDERS.has(c.id);
    return (
      <div key={c.id} className="connector-card">
        <div className="connector-card-top">
          <ConnectorIcon id={c.id} name={c.name} />
          <StatusBadge status={rt.status} />
        </div>
        <h3 className="connector-name">{c.name}</h3>
        <p className="connector-description">{c.description}</p>

        <div className="connector-actions">
          {usable ? (
            <Link href="/workspaces" className="btn-primary btn-sm">
              Usar
            </Link>
          ) : (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setDrawerId(c.id)}
            >
              Usar
            </button>
          )}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setDrawerId(c.id)}
          >
            Configurar
          </button>
          <button
            type="button"
            className="connector-more"
            aria-label="Mais opções"
            aria-haspopup="menu"
            aria-expanded={openMenu === c.id}
            onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
          >
            ⋯
            {openMenu === c.id ? (
              <span className="connector-menu" role="menu">
                <button type="button" onClick={() => setDrawerId(c.id)}>
                  Detalhes
                </button>
                <button type="button" onClick={() => runTest(c.id)}>
                  Testar ligação
                </button>
                <button type="button" onClick={() => runDisconnect(c.id)}>
                  Desligar
                </button>
                <Link href="/admin/system">Ver logs</Link>
              </span>
            ) : null}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="ecosystem-tabs" role="tablist">
        {(["Todas", ...CATEGORY_ORDER] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`ecosystem-pill${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="ecosystem-toolbar">
        <input
          type="search"
          className="ecosystem-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar ferramentas…"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="meta italic">Nenhuma ferramenta corresponde à pesquisa.</p>
      ) : (
        <div className="connector-grid">{filtered.map(renderCard)}</div>
      )}

      {drawer ? (
        <ConnectorDrawer
          connector={drawer}
          status={runtime[drawer.id].status}
          message={runtime[drawer.id].message}
          lastChecked={runtime[drawer.id].lastChecked}
          testing={runtime[drawer.id].testing}
          manageable={manageable}
          onClose={() => setDrawerId(null)}
          onTest={() => runTest(drawer.id)}
          onDisconnect={() => runDisconnect(drawer.id)}
          onSaved={() => runTest(drawer.id)}
        />
      ) : null}
    </div>
  );
}
