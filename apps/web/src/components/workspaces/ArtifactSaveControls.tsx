"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createArtifact,
  updateArtifact,
  loadArtifactDetail,
} from "@/app/(main)/workspaces/[workspaceId]/artifact-actions";
import { lineDiff } from "@/lib/line-diff";

/** Artifact kinds offered when saving a Council reply. */
const KINDS = ["documento", "código", "especificação", "nota", "outro"] as const;

/** Accent/punct-insensitive token set, words of length ≥ 3. */
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3)
  );
}

/** Title-overlap similarity in [0,1]. */
function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  Array.from(ta).forEach((t) => {
    if (tb.has(t)) shared++;
  });
  return shared / Math.min(ta.size, tb.size);
}

/** The reply's likely title: first non-empty line, markdown stripped. */
function guessTitle(content: string): string {
  const line = content.split("\n").find((l) => l.trim()) ?? "";
  return line.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim().slice(0, 120);
}

/**
 * Living Artifacts (Sprint 3 PR2) — discreet per-message control "↓ Artefacto".
 * On open it detects whether the reply matches an existing artifact by name: if
 * so it offers "Actualizar «nome»?" with a diff preview; otherwise a small form
 * (title + type) to create a new one. The author is always the Council.
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
  const [open, setOpen] = useState(false);
  // "create" | "update" — chosen on open from the name match, switchable.
  const [mode, setMode] = useState<"create" | "update">("create");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("documento");
  const [target, setTarget] = useState("");
  const [diff, setDiff] = useState<{ id: string; prev: string } | null>(null);

  const replyTitle = useMemo(() => guessTitle(content), [content]);

  // Best existing artifact by title similarity to the reply.
  const match = useMemo(() => {
    let best: { id: string; title: string; score: number } | null = null;
    for (const a of artifacts) {
      const score = similarity(replyTitle, a.title);
      if (!best || score > best.score) best = { ...a, score };
    }
    return best && best.score >= 0.5 ? best : null;
  }, [artifacts, replyTitle]);

  const onOpen = () => {
    setMsg(null);
    setTitle(replyTitle);
    if (match) {
      setMode("update");
      setTarget(match.id);
    } else {
      setMode("create");
      setTarget("");
    }
    setOpen(true);
  };

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
      setOpen(false);
      router.refresh();
    }
    setBusy(false);
  };

  const update = async (id: string) => {
    if (!id) return;
    setBusy(true);
    setMsg(null);
    const r = await updateArtifact({
      id,
      content,
      workspaceId,
      createdBy: "Council",
    });
    setMsg(r.message);
    if (r.ok) {
      setOpen(false);
      router.refresh();
    }
    setBusy(false);
  };

  const toggleDiff = async (id: string) => {
    if (diff?.id === id) {
      setDiff(null);
      return;
    }
    const detail = await loadArtifactDetail(id);
    setDiff({ id, prev: detail?.content ?? "" });
  };

  const targetTitle =
    artifacts.find((a) => a.id === target)?.title ?? match?.title ?? "";

  return (
    <div className="ws-artifact-controls">
      {!open ? (
        <button type="button" className="action-quiet" onClick={onOpen} disabled={busy}>
          ↓ Artefacto
        </button>
      ) : (
        <div className="ws-artifact-panel">
          {mode === "update" ? (
            <>
              <div className="ws-artifact-suggest">
                <span>
                  Actualizar <strong>«{targetTitle}»</strong>?
                </span>
                {artifacts.length > 1 ? (
                  <select
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value);
                      setDiff(null);
                    }}
                    disabled={busy}
                    aria-label="Escolher artefacto"
                  >
                    {artifacts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <div className="ws-artifact-row">
                <button
                  type="button"
                  className="action"
                  onClick={() => update(target)}
                  disabled={busy || !target}
                >
                  {busy ? "A actualizar…" : "Actualizar"}
                </button>
                <button
                  type="button"
                  className="artifact-revision-link"
                  onClick={() => toggleDiff(target)}
                  disabled={busy || !target}
                >
                  {diff?.id === target ? "ocultar diff" : "ver diff"}
                </button>
                <button
                  type="button"
                  className="artifact-revision-link"
                  onClick={() => {
                    setMode("create");
                    setDiff(null);
                  }}
                  disabled={busy}
                >
                  criar novo
                </button>
                <button
                  type="button"
                  className="action-quiet"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  Cancelar
                </button>
              </div>
              {diff?.id === target ? (
                <pre className="artifact-revision-diff">
                  {lineDiff(diff.prev, content).map((row, k) => (
                    <span key={k} className={`diff-${row.type}`}>
                      {row.type === "add" ? "+ " : row.type === "del" ? "- " : "  "}
                      {row.text}
                      {"\n"}
                    </span>
                  ))}
                </pre>
              ) : null}
            </>
          ) : (
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
              <button type="button" className="action" onClick={create} disabled={busy}>
                {busy ? "A guardar…" : "Criar"}
              </button>
              {artifacts.length ? (
                <button
                  type="button"
                  className="artifact-revision-link"
                  onClick={() => {
                    setMode("update");
                    if (!target) setTarget(match?.id ?? artifacts[0].id);
                  }}
                  disabled={busy}
                >
                  actualizar existente
                </button>
              ) : null}
              <button
                type="button"
                className="action-quiet"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
      {msg ? <span className="meta">{msg}</span> : null}
    </div>
  );
}
