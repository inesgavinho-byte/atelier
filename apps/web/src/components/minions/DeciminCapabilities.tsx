"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ago } from "@/components/mission/bits";
import { setCapabilityMode } from "@/app/(main)/minions/actions";
import {
  CAPABILITY_LABELS,
  type CapabilityMode,
  type DeciminCapability,
} from "@/lib/decimin-constants";

/**
 * Shadow Mode (Personal Decimin v2). Each capability runs active / shadow /
 * off. In shadow it computes silently and records what it would have sent —
 * shown here so the user can compare and promote it to active when trusted.
 */

const MODES: { value: CapabilityMode; label: string }[] = [
  { value: "off", label: "Desligado" },
  { value: "shadow", label: "Shadow" },
  { value: "active", label: "Activo" },
];

export default function DeciminCapabilities({
  capabilities,
}: {
  capabilities: DeciminCapability[];
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);

  if (capabilities.length === 0) return null;

  const setMode = (capability: string, mode: CapabilityMode) =>
    start(async () => {
      const r = await setCapabilityMode(capability, mode);
      setMsg(r.message);
      router.refresh();
    });

  return (
    <section className="cw cap">
      <header className="cw-head">
        <h2 className="eyebrow">Capacidades do Decimin</h2>
        <p className="meta">
          Cada capacidade começa silenciosa (shadow) e só age quando ganha
          confiança. Em shadow regista o que <em>teria</em> feito.
        </p>
      </header>

      <ul className="cap-list">
        {capabilities.map((c) => (
          <li key={c.capability} className="cap-item">
            <div className="cap-main">
              <span className="cap-title">
                {CAPABILITY_LABELS[c.capability] ?? c.capability}
              </span>
              {c.mode === "shadow" && c.lastShadowAt ? (
                <button
                  type="button"
                  className="cap-shadow-link"
                  onClick={() =>
                    setShown((s) => (s === c.capability ? null : c.capability))
                  }
                >
                  {shown === c.capability ? "Esconder" : "Ver"} última saída shadow ·{" "}
                  {ago(c.lastShadowAt)}
                </button>
              ) : null}
            </div>
            <div className="cap-modes" role="group">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`cap-mode${c.mode === m.value ? " active" : ""}`}
                  onClick={() => setMode(c.capability, m.value)}
                  disabled={busy || c.mode === m.value}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {shown === c.capability && c.lastShadowOutput ? (
              <pre className="cap-shadow-output">{c.lastShadowOutput}</pre>
            ) : null}
          </li>
        ))}
      </ul>

      {msg ? <p className="meta mt-2">{msg}</p> : null}
    </section>
  );
}
