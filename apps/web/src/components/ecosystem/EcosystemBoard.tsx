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
import ConnectorDrawer from "@/components/ecosystem/ConnectorDrawer";
import ConnectorIcon from "@/components/ecosystem/ConnectorIcon";

interface Runtime {
  status: ConnectorStatus;
  message?: string;
  lastChecked?: string;
  testing: boolean;
}

/** status → state-dot class (the text badges were retired in the compact UI). */
const DOT: Record<ConnectorStatus, string> = {
  Ligado: "eco-dot-green",
  "Credenciais em falta": "eco-dot-amber",
  "Requer OAuth": "eco-dot-oauth",
  Erro: "eco-dot-red",
  "Em teste": "eco-dot-testing",
  "Não ligado": "eco-dot-grey",
};

/** Accessible label for the dot (the only status cue on the card). */
const DOT_LABEL: Record<ConnectorStatus, string> = {
  Ligado: "Ligado",
  "Credenciais em falta": "Credenciais em falta",
  "Requer OAuth": "Requer OAuth",
  Erro: "Erro",
  "Em teste": "A testar",
  "Não ligado": "Não configurado",
};

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
  const [drawerId, setDrawerId] = useState<string | null>(null);
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

  const runDisconnect = (id: string) => {
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

  const sections = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: filtered.filter((c) => c.category === cat),
  })).filter((s) => s.items.length > 0);

  const drawer = connectors.find((c) => c.id === drawerId) ?? null;

  // A single compact row: icon + name + short description + state dot. The
  // whole row is the hit target — clicking opens the drawer (or navigates,
  // for tool connectors that declare an href).
  const renderRow = (c: ConnectorView) => {
    const status = runtime[c.id].status;
    const dot = (
      <span
        className={`eco-dot ${DOT[status] ?? "eco-dot-grey"}`}
        title={DOT_LABEL[status] ?? "Não configurado"}
        aria-label={DOT_LABEL[status] ?? "Não configurado"}
        role="img"
      />
    );
    const inner = (
      <>
        <span className="eco-row-icon">
          <ConnectorIcon connectorId={c.id} name={c.name} size={28} />
        </span>
        <span className="eco-row-body">
          <span className="eco-row-name">{c.name}</span>
          <span className="eco-row-desc">{c.description}</span>
        </span>
        {dot}
      </>
    );

    if (c.href) {
      return (
        <Link key={c.id} href={c.href} className="connector-card eco-row">
          {inner}
        </Link>
      );
    }
    return (
      <button
        key={c.id}
        type="button"
        className="connector-card eco-row"
        onClick={() => setDrawerId(c.id)}
      >
        {inner}
      </button>
    );
  };

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
        sections.map((s) => (
          <section key={s.category} className="ecosystem-section">
            <h2 className="ecosystem-section-title">{s.category}</h2>
            <div className="connector-grid">{s.items.map(renderRow)}</div>
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
