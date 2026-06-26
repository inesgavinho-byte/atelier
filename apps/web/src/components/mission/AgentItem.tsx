"use client";

import { useState } from "react";
import Link from "next/link";
import type { Agent } from "@/data/mission";
import { Meter, StateTag } from "@/components/mission/bits";

/**
 * An agent's operational state, with inline supervision (EPIC-001 §3):
 * interrupt, delegate, change priority. Mocked via local state.
 */
export default function AgentItem({ agent }: { agent: Agent }) {
  const [interrupted, setInterrupted] = useState(false);
  const working = agent.state === "em execução" && !interrupted;

  return (
    <article className="border-b border-line py-5 first:pt-0">
      <div className="flex items-baseline justify-between gap-4">
        <Link
          href={`/agents/${agent.id}`}
          className="font-serif text-xl transition-colors hover:text-olive"
        >
          {agent.role}
        </Link>
        <StateTag state={interrupted ? "a aguardar" : agent.state} />
      </div>

      <p className="meta mt-1">
        {agent.office} · {agent.provider} · autonomia {agent.autonomy}
      </p>

      <p className="mt-3 text-[14px] leading-relaxed text-charcoal/90">
        {agent.currentTask}
      </p>

      {working ? (
        <div className="mt-3">
          <Meter value={agent.progress} />
          <p className="meta mt-1">{agent.progress}%</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        {working ? (
          <button
            type="button"
            className="action-quiet"
            onClick={() => setInterrupted(true)}
          >
            Interromper
          </button>
        ) : interrupted ? (
          <button
            type="button"
            className="action-quiet"
            onClick={() => setInterrupted(false)}
          >
            Retomar
          </button>
        ) : null}
        <button type="button" className="action-quiet">
          Delegar
        </button>
        <button type="button" className="action-quiet">
          Alterar prioridade
        </button>
      </div>
    </article>
  );
}
