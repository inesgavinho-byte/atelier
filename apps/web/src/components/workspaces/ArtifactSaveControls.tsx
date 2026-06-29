"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createArtifact,
  updateArtifact,
} from "@/app/(main)/workspaces/[workspaceId]/artifact-actions";

/**
 * Living Artifacts (Bloco E) — per-message controls in the chat. "Guardar como
 * artefacto" creates a new artifact from the reply; "Actualizar artefacto"
 * commits the reply as a new revision of an existing one.
 */
export default function ArtifactSaveControls({
  workspaceId,
  content,
  artifacts,
}: {
  workspaceId: string;
  content: string;
  artifacts: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [target, setTarget] = useState("");

  const create = async () => {
    setBusy(true);
    setMsg(null);
    const r = await createArtifact({ workspaceId, content });
    setMsg(r.message);
    if (r.ok) router.refresh();
    setBusy(false);
  };

  const update = async () => {
    if (!target) return;
    setBusy(true);
    setMsg(null);
    const r = await updateArtifact({ id: target, content, workspaceId });
    setMsg(r.message);
    if (r.ok) router.refresh();
    setBusy(false);
  };

  return (
    <div className="ws-artifact-controls">
      <button
        type="button"
        className="action-quiet"
        onClick={create}
        disabled={busy}
      >
        Guardar como artefacto
      </button>
      {artifacts.length ? (
        <span className="ws-artifact-update">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={busy}
            aria-label="Actualizar artefacto"
          >
            <option value="">Actualizar artefacto…</option>
            {artifacts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="action-quiet"
            onClick={update}
            disabled={busy || !target}
          >
            Actualizar
          </button>
        </span>
      ) : null}
      {msg ? <span className="meta">{msg}</span> : null}
    </div>
  );
}
