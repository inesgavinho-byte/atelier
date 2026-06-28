"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AgentState, Priority } from "@/data/mission";
import { setAgentState, setAgentPriority } from "@/app/(main)/agents/actions";

const PRIORITIES: Priority[] = ["alta", "média", "baixa"];

/**
 * Supervision controls for an agent (EPIC-001 §3): interrupt/resume, delegate,
 * change priority. These persist via server actions — each change updates the
 * agent and appends to the activity log — and the page refreshes to show it.
 */
export default function AgentControls({
  agentId,
  state,
  priority,
}: {
  agentId: string;
  state: AgentState;
  priority: Priority;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const running = state === "em execução";
  const nextPriority =
    PRIORITIES[(PRIORITIES.indexOf(priority) + 1) % PRIORITIES.length];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="action"
        disabled={pending || state === "em revisão"}
        onClick={() =>
          run(() =>
            setAgentState(agentId, "em revisão", "Trabalho delegado para revisão")
          )
        }
      >
        Delegar trabalho
      </button>

      {running ? (
        <button
          type="button"
          className="action-quiet"
          disabled={pending}
          onClick={() =>
            run(() =>
              setAgentState(agentId, "a aguardar", "Execução interrompida")
            )
          }
        >
          Interromper
        </button>
      ) : (
        <button
          type="button"
          className="action-quiet"
          disabled={pending}
          onClick={() =>
            run(() => setAgentState(agentId, "em execução", "Execução retomada"))
          }
        >
          Retomar
        </button>
      )}

      <button
        type="button"
        className="action-quiet"
        disabled={pending}
        onClick={() => run(() => setAgentPriority(agentId, nextPriority))}
      >
        Prioridade: {priority}
      </button>

      {pending ? <span className="meta italic">a guardar…</span> : null}
    </div>
  );
}
