"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconX } from "@tabler/icons-react";
import { ago } from "@/components/mission/bits";
import {
  loadArtifactDetail,
  updateArtifact,
  restoreArtifactRevision,
} from "@/app/(main)/workspaces/[workspaceId]/artifact-actions";
import type { ArtifactDetail, ArtifactRevision } from "@/lib/artifacts";

/** Minimal LCS line-diff → rows tagged as kept/added/removed. */
type DiffRow = { type: "same" | "add" | "del"; text: string };
function lineDiff(prev: string, next: string): DiffRow[] {
  const a = prev.split("\n");
  const b = next.split("\n");
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ type: "del", text: a[i] });
      i++;
    } else {
      rows.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) rows.push({ type: "del", text: a[i++] });
  while (j < m) rows.push({ type: "add", text: b[j++] });
  return rows;
}

/**
 * Living Artifact drawer (Sprint 3). Opens for one artifact: editable canonical
 * content + a save (which records a new revision with a Haiku summary), and the
 * full revision history (number, summary, author, date) with per-revision
 * preview, "ver diff" against the prior revision, and restore.
 */
export default function ArtifactDrawer({
  artifactId,
  workspaceId,
  onClose,
}: {
  artifactId: string;
  workspaceId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<ArtifactDetail | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [diffOf, setDiffOf] = useState<number | null>(null);

  const reload = async () => {
    const fresh = await loadArtifactDetail(artifactId);
    setDetail(fresh);
    return fresh;
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadArtifactDetail(artifactId).then((d) => {
      if (!active) return;
      setDetail(d);
      setContent(d?.content ?? "");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [artifactId]);

  const dirty = detail !== null && content !== detail.content;

  // Revision number → content, for computing a diff against the prior revision.
  const byRevision = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of detail?.revisions ?? []) m.set(r.revision, r.content);
    return m;
  }, [detail]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const r = await updateArtifact({ id: artifactId, content, workspaceId });
    setMsg(r.message);
    if (r.ok) {
      const fresh = await reload();
      setContent(fresh?.content ?? content);
      router.refresh();
    }
    setSaving(false);
  };

  const restore = async (revision: number) => {
    setSaving(true);
    setMsg(null);
    const r = await restoreArtifactRevision({ id: artifactId, revision, workspaceId });
    setMsg(r.message);
    if (r.ok) {
      const fresh = await reload();
      setContent(fresh?.content ?? content);
      router.refresh();
    }
    setSaving(false);
  };

  const renderHistoryItem = (r: ArtifactRevision, isCurrent: boolean) => {
    const prev = byRevision.get(r.revision - 1);
    return (
      <li key={r.id}>
        <div className="artifact-revision-row">
          <button
            type="button"
            className="artifact-revision"
            onClick={() =>
              setPreview((p) => (p === r.revision ? null : r.revision))
            }
          >
            <span className="artifact-revision-v">
              v{r.revision}
              {isCurrent ? <span className="artifact-revision-current"> · actual</span> : null}
            </span>
            <span className="artifact-revision-summary">
              {r.summary || "—"}
            </span>
            <span className="artifact-revision-at">
              {r.createdBy ? `${r.createdBy} · ` : ""}
              {ago(r.createdAt)}
            </span>
          </button>
          <div className="artifact-revision-tools">
            {prev !== undefined ? (
              <button
                type="button"
                className="artifact-revision-link"
                onClick={() =>
                  setDiffOf((d) => (d === r.revision ? null : r.revision))
                }
              >
                {diffOf === r.revision ? "ocultar diff" : "ver diff"}
              </button>
            ) : null}
            {!isCurrent ? (
              <button
                type="button"
                className="artifact-revision-link"
                onClick={() => restore(r.revision)}
                disabled={saving}
              >
                restaurar
              </button>
            ) : null}
          </div>
        </div>
        {preview === r.revision ? (
          <pre className="artifact-revision-preview">{r.content}</pre>
        ) : null}
        {diffOf === r.revision && prev !== undefined ? (
          <pre className="artifact-revision-diff">
            {lineDiff(prev, r.content).map((row, k) => (
              <span key={k} className={`diff-${row.type}`}>
                {row.type === "add" ? "+ " : row.type === "del" ? "- " : "  "}
                {row.text}
                {"\n"}
              </span>
            ))}
          </pre>
        ) : null}
      </li>
    );
  };

  return (
    <div className="artifact-drawer-backdrop" onClick={onClose}>
      <aside
        className="artifact-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Artefacto"
      >
        <header className="artifact-drawer-head">
          <div className="artifact-drawer-titles">
            <span className="artifact-drawer-title">
              {detail?.title ?? "Artefacto"}
            </span>
            {detail ? (
              <span className="artifact-drawer-meta">
                {detail.kind} · v{detail.revision}
                {detail.updatedAt ? ` · ${ago(detail.updatedAt)}` : ""}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="ctx-strip-toggle"
            onClick={onClose}
            aria-label="Fechar"
          >
            <IconX size={16} stroke={1.8} />
          </button>
        </header>

        {loading ? (
          <p className="meta p-4">A carregar…</p>
        ) : !detail ? (
          <p className="meta p-4">Artefacto não encontrado.</p>
        ) : (
          <div className="artifact-drawer-body">
            <textarea
              className="artifact-drawer-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conteúdo do artefacto…"
              spellCheck={false}
            />
            <div className="artifact-drawer-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={save}
                disabled={saving || !dirty}
              >
                {saving ? "A guardar…" : dirty ? "Guardar revisão" : "Sem alterações"}
              </button>
              {msg ? <span className="meta">{msg}</span> : null}
            </div>

            {detail.revisions.length > 0 ? (
              <div className="artifact-revisions">
                <p className="artifact-revisions-title">
                  Histórico ({detail.revisions.length})
                </p>
                <ul className="artifact-revisions-list">
                  {detail.revisions.map((r) =>
                    renderHistoryItem(r, r.revision === detail.revision)
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
