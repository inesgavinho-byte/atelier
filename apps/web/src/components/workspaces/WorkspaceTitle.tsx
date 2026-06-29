"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWorkspace } from "@/app/(main)/workspaces/actions";

/**
 * The workspace header title, editable in place. Shows the name (+ intent) with
 * a discreet "Renomear" affordance; clicking it swaps in name/intent inputs —
 * Enter saves, Escape cancels. The slug follows the name automatically (server
 * side), so on a successful rename we navigate to the canonical URL; the
 * sidebar avatar re-derives from the new name on refresh.
 */
export default function WorkspaceTitle({
  workspaceId,
  name,
  intent,
}: {
  workspaceId: string;
  name: string;
  intent?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const [intentVal, setIntentVal] = useState(intent ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cancel = () => {
    setNameVal(name);
    setIntentVal(intent ?? "");
    setErr(null);
    setEditing(false);
  };

  const save = async () => {
    const trimmed = nameVal.trim();
    if (!trimmed) {
      setErr("O nome não pode ficar vazio.");
      return;
    }
    setSaving(true);
    setErr(null);
    const r = await updateWorkspace(workspaceId, {
      name: trimmed,
      intent: intentVal,
    });
    setSaving(false);
    if (!r.ok) {
      setErr(r.message);
      return;
    }
    setEditing(false);
    if (r.slug) router.push(`/workspaces/${r.slug}`);
    else router.refresh();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      cancel();
    }
  };

  if (!editing) {
    return (
      <div className="ws-title-block">
        <h1 className="ws-header-title">
          {name}
          <button
            type="button"
            className="ws-title-edit"
            onClick={() => setEditing(true)}
          >
            Renomear
          </button>
        </h1>
        {intent ? <p className="ws-header-intent">{intent}</p> : null}
      </div>
    );
  }

  return (
    <div className="ws-title-edit-form">
      <input
        type="text"
        className="ws-title-input"
        value={nameVal}
        onChange={(e) => setNameVal(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Nome do workspace"
        aria-label="Nome do workspace"
        autoFocus
        disabled={saving}
      />
      <input
        type="text"
        className="ws-intent-input"
        value={intentVal}
        onChange={(e) => setIntentVal(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Intenção (opcional)"
        aria-label="Intenção do workspace"
        disabled={saving}
      />
      <div className="ws-title-actions">
        <button
          type="button"
          className="action"
          onClick={() => void save()}
          disabled={saving || !nameVal.trim()}
        >
          {saving ? "A guardar…" : "Guardar"}
        </button>
        <button
          type="button"
          className="action-quiet"
          onClick={cancel}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
      {err ? <p className="ws-title-err">{err}</p> : null}
    </div>
  );
}
