"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconX } from "@tabler/icons-react";
import { ago } from "@/components/mission/bits";
import {
  loadArtifactDetail,
  updateArtifact,
} from "@/app/(main)/workspaces/[workspaceId]/artifact-actions";
import type { ArtifactDetail } from "@/lib/artifacts";

/**
 * Living Artifact drawer (Bloco E). Opens for one artifact: editable canonical
 * content + a save (which creates a new revision) and the revision history
 * (click a past revision to preview it read-only). Overlay; closes on backdrop.
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

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const r = await updateArtifact({ id: artifactId, content, workspaceId });
    setMsg(r.message);
    if (r.ok) {
      const fresh = await loadArtifactDetail(artifactId);
      setDetail(fresh);
      setContent(fresh?.content ?? content);
      router.refresh();
    }
    setSaving(false);
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
                v{detail.revision}
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
                  {detail.revisions.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="artifact-revision"
                        onClick={() =>
                          setPreview((p) => (p === r.revision ? null : r.revision))
                        }
                      >
                        <span>v{r.revision}</span>
                        <span className="artifact-revision-at">{ago(r.createdAt)}</span>
                      </button>
                      {preview === r.revision ? (
                        <pre className="artifact-revision-preview">{r.content}</pre>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
