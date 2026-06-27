"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createArtifactFromMessage,
  createDecisionFromMessage,
  saveMessageAsCapture,
  saveMessageAsReading,
} from "@/app/(main)/workspaces/actions";

type Kind = "capture" | "decision" | "artifact" | "reading";

const RUNNERS: Record<Kind, (content: string) => Promise<{ ok: boolean; message: string }>> = {
  capture: saveMessageAsCapture,
  decision: createDecisionFromMessage,
  artifact: createArtifactFromMessage,
  reading: saveMessageAsReading,
};

const LABELS: { kind: Kind; label: string }[] = [
  { kind: "capture", label: "Guardar como Captura" },
  { kind: "decision", label: "Criar Decisão" },
  { kind: "artifact", label: "Criar Artefacto" },
  { kind: "reading", label: "Guardar Leitura" },
];

/**
 * Turn an AI response into an ATELIER object (Capture, Decision, Artifact or
 * Reading) without copy/paste.
 */
export default function MessageActions({ content }: { content: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const run = (kind: Kind) => {
    setMsg(null);
    start(async () => {
      const r = await RUNNERS[kind](content);
      setMsg(r.message);
      if (r.ok) router.refresh();
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      {LABELS.map((a) => (
        <button
          key={a.kind}
          type="button"
          className="action-quiet"
          onClick={() => run(a.kind)}
          disabled={busy}
        >
          {a.label}
        </button>
      ))}
      {msg ? <span className="meta">{msg}</span> : null}
    </div>
  );
}
