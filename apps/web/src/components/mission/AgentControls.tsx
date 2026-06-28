"use client";

import { useState } from "react";
import type { AgentState } from "@/data/mission";

type Action = "delegado" | "interrompido" | null;

const PRIORITIES = ["Normal", "Alta", "Baixa"] as const;

/**
 * Supervision controls for an agent (EPIC-001 §3): interrupt, delegate, change
 * priority. DEMONSTRATION ONLY — state is local and does not persist. Real
 * persistence (server actions + activity log) is planned for a later phase.
 */
export default function AgentControls({ state }: { state: AgentState }) {
  const [action, setAction] = useState<Action>(null);
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>(
    "Normal"
  );

  const cyclePriority = () =>
    setPriority(
      (p) => PRIORITIES[(PRIORITIES.indexOf(p) + 1) % PRIORITIES.length]
    );

  const canInterrupt = state === "em execução" && action !== "interrompido";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="action"
          onClick={() => setAction("delegado")}
        >
          Delegar trabalho
        </button>
        {canInterrupt ? (
          <button
            type="button"
            className="action-quiet"
            onClick={() => setAction("interrompido")}
          >
            Interromper
          </button>
        ) : action === "interrompido" ? (
          <button
            type="button"
            className="action-quiet"
            onClick={() => setAction(null)}
          >
            Retomar
          </button>
        ) : null}
        <button type="button" className="action-quiet" onClick={cyclePriority}>
          Prioridade: {priority}
        </button>
        <span className="meta italic">demonstração — não persiste</span>
      </div>

      {action ? (
        <p className="meta mt-3 inline-flex items-center gap-2">
          <span className="dot bg-olive" />
          {action === "delegado"
            ? "Trabalho delegado a outro agente."
            : "Execução interrompida."}
          <button
            type="button"
            className="action-quiet underline"
            onClick={() => setAction(null)}
          >
            Anular
          </button>
        </p>
      ) : null}
    </div>
  );
}
