"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateWorkspace } from "@/app/(main)/workspaces/actions";

/**
 * The "Mais" (overflow) pill in the workspace action bar. Holds the actions
 * that left the central canvas when the large title was removed: the workspace
 * progress read-out and inline rename (name + intent). Opens a small popover;
 * closes on outside click or Escape. Rename navigates to the canonical slug on
 * success, mirroring the old WorkspaceTitle behaviour.
 */
export default function WorkspaceMoreMenu({
  workspaceId,
  name,
  intent,
  progress,
}: {
  workspaceId: string;
  name: string;
  intent?: string;
  progress: number;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const [intentVal, setIntentVal] = useState(intent ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setEditing(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    setOpen(false);
    setEditing(false);
    if (r.slug) router.push(`/workspaces/${r.slug}`);
    else router.refresh();
  };

  return (
    <div className="ws-more" ref={ref}>
      <button
        type="button"
        className={`ws-pill ws-pill-icon${open ? " active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mais"
      >
        •••
      </button>

      {open ? (
        <div className="ws-more-menu" role="menu">
          {!editing ? (
            <>
              <div className="ws-more-progress">
                <span>Progresso</span>
                <span className="ws-more-progress-val">{progress}%</span>
              </div>
              <button
                type="button"
                className="ws-more-item"
                onClick={() => {
                  setNameVal(name);
                  setIntentVal(intent ?? "");
                  setErr(null);
                  setEditing(true);
                }}
              >
                Renomear workspace
              </button>
            </>
          ) : (
            <div className="ws-more-rename">
              <input
                type="text"
                className="ws-more-input"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                placeholder="Nome do workspace"
                aria-label="Nome do workspace"
                autoFocus
                disabled={saving}
              />
              <input
                type="text"
                className="ws-more-input ws-more-input-sub"
                value={intentVal}
                onChange={(e) => setIntentVal(e.target.value)}
                placeholder="Intenção (opcional)"
                aria-label="Intenção do workspace"
                disabled={saving}
              />
              {err ? <p className="ws-more-err">{err}</p> : null}
              <div className="ws-more-rename-actions">
                <button
                  type="button"
                  className="action btn-sm"
                  onClick={() => void save()}
                  disabled={saving || !nameVal.trim()}
                >
                  {saving ? "A guardar…" : "Guardar"}
                </button>
                <button
                  type="button"
                  className="btn-quiet btn-sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
