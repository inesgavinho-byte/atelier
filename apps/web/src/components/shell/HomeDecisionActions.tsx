"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDecisionStatus } from "@/app/(main)/actions";

/**
 * Inline approve / request-review for a pending decision on the Home panel.
 * Persists via the same server action the decisions queue uses, then refreshes
 * so the resolved decision leaves the pending list.
 */
export default function HomeDecisionActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  const act = (status: "aprovada" | "revisão", label: string) =>
    start(async () => {
      await setDecisionStatus(id, status);
      setDone(label);
      router.refresh();
    });

  if (done) {
    return <span className="home-decision-done">{done}</span>;
  }

  return (
    <>
      <button
        type="button"
        className="btn-approve btn-sm"
        disabled={pending}
        onClick={() => act("aprovada", "Aprovada")}
      >
        Aprovar
      </button>
      <button
        type="button"
        className="btn-quiet btn-sm"
        disabled={pending}
        onClick={() => act("revisão", "Em revisão")}
      >
        Rever
      </button>
    </>
  );
}
