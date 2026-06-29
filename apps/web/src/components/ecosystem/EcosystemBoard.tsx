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
  encrypted,
}: {
  connectors: ConnectorView[];
  manageable: boolean;
  encrypted: boolean;
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

  // Group filtered connectors by category, preserving the canonical order.
  const sections = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: filtered.filter((c) => c.category === cat),
  })).filter((s) => s.items.length > 0);

  const drawer = connectors.find((c) => c.id === drawerId) ?? null;

  const renderCard = (c: ConnectorView) => {
    const rt = runtime[c.id];
    const usable = SESSION_PROVIDERS.has(c.id);
    return (
      <div key={c.id} className="connector-card">
        <div>
          <div className="connector-card-top">
            <span className="connector-logo">
              <ConnectorIcon connectorId={c.id} name={c.name} size={32} />
            </span>
            <StatusBadge status={rt.status} />
          </div>
          <h3 className="connector-name">{c.name}</h3>
          <p className="connector-description">{c.description}</p>

          {c.usedIn?.length ? (
            <div className="connector-used">
              <div className="connector-used-label">Usado em</div>
              <div className="connector-tags">
                {c.usedIn.map((u) => (
                  <span key={u} className="connector-tag">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {c.metric ? <div className="connector-metric">{c.metric}</div> : null}
        </div>

        <div className="connector-actions">
          {c.href ? (
            <Link href={c.href} className="connector-button primary">
              Abrir
            </Link>
          ) : usable ? (
            <Link href="/workspaces" className="connector-button primary">
              Usar
            </Link>
          ) : (
            <button
              type="button"
              className="connector-button primary"
              onClick={() => setDrawerId(c.id)}
            >
              Usar
            </button>
          )}
          <button
            type="button"
            className="connector-button"
            onClick={() => setDrawerId(c.id)}
          >
            Configurar
          </button>
          <button
            type="button"
            className="connector-more"
            aria-label="Mais opções"
            onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
          >
            ⋯
            {openMenu === c.id ? (
              <span className="connector-menu">
                <button type="button" onClick={() => setDrawerId(c.id)}>
                  Detalhes
                </button>
                <button
                  type="button"
                  onClick={() => runTest(c.id)}
                  disabled={c.auth === "oauth"}
                  title={c.auth === "oauth" ? "Requer OAuth" : undefined}
                >
                  Testar ligação
                </button>
                <button type="button" onClick={() => runDisconnect(c.id)}>
                  Desligar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    setDrawerId(c.id);
                  }}
                >
                  Ver logs
                </button>
              </span>
            ) : null}
          </button>
        </div>
      </div>
    );
  };

  const addCard = (
    <div className="connector-add-card" key="__add">
      <div>
        <div className="connector-add-plus">+</div>
        <div className="connector-add-title">Adicionar ferramenta</div>
        <div className="connector-add-subtitle">Mais integrações em breve</div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="ecosystem-toolbar">
        <input
          type="search"
          className="ecosystem-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar ferramentas…"
        />
      </div>

      <div className="ecosystem-tabs">
        {(["Todas", ...CATEGORY_ORDER] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`ecosystem-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <p className="meta italic">Nenhuma ferramenta corresponde à pesquisa.</p>
      ) : (
        sections.map((s, idx) => (
          <section key={s.category} className="ecosystem-section">
            <h2 className="ecosystem-section-title">{s.category}</h2>
            <div className="connector-grid">
              {s.items.map(renderCard)}
              {idx === sections.length - 1 ? addCard : null}
            </div>
          </section>
        ))
      )}

      {drawer ? (
        <ConnectorDrawer
          connector={drawer}
          status={runtime[drawer.id].status}
          message={runtime[drawer.id].message}
          lastChecked={runtime[drawer.id].lastChecked}
          testing={runtime[drawer.id].testing}
          manageable={manageable}
          encrypted={encrypted}
          onClose={() => setDrawerId(null)}
          onTest={() => runTest(drawer.id)}
          onDisconnect={() => runDisconnect(drawer.id)}
          onSaved={() => runTest(drawer.id)}
        />
      ) : null}
    </div>
  );
}
