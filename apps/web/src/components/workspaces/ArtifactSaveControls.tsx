"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createArtifact,
  updateArtifact,
} from "@/app/(main)/workspaces/[workspaceId]/artifact-actions";

/** Artifact kinds offered when saving a Council reply. */
const KINDS = ["documento", "código", "especificação", "nota", "outro"] as const;

/**
 * Living Artifacts (Sprint 3) — per-message controls in the chat. "Guardar como
 * artefacto" opens a small form (title + type) and creates the artifact with the
 * reply as revision 1 (authored by the Council); "Actualizar artefacto" commits
 * the reply as a new revision of an existing one.
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
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("documento");

  const create = async () => {
    setBusy(true);
    setMsg(null);
    const r = await createArtifact({
      workspaceId,
      content,
      title: title.trim() || undefined,
      kind,
      createdBy: "Council",
    });
    setMsg(r.message);
    if (r.ok) {
      setCreating(false);
      setTitle("");
      router.refresh();
    }
    setBusy(false);
  };

  const update = async () => {
    if (!target) return;
    setBusy(true);
    setMsg(null);
    const r = await updateArtifact({
      id: target,
      content,
      workspaceId,
      createdBy: "Council",
    });
    setMsg(r.message);
    if (r.ok) router.refresh();
    setBusy(false);
  };

  return (
    <div className="ws-artifact-controls">
      {creating ? (
        <div className="ws-artifact-create">
          <input
            className="ws-artifact-input"
            placeholder="Título do artefacto…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={busy}
            aria-label="Tipo"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="action"
            onClick={create}
            disabled={busy}
          >
            {busy ? "A guardar…" : "Criar"}
          </button>
          <button
            type="button"
            className="action-quiet"
            onClick={() => setCreating(false)}
            disabled={busy}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="action-quiet"
          onClick={() => setCreating(true)}
          disabled={busy}
        >
          Guardar como artefacto
        </button>
      )}
      {!creating && artifacts.length ? (
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
