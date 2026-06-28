"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  READING_STATUSES,
  READING_TAGS,
  type Reading,
} from "@/lib/readings-constants";
import {
  createReading,
  previewReadingUrl,
  setReadingStatus,
} from "@/app/(main)/readings/actions";

interface WorkspaceOption {
  id: string;
  name: string;
}

interface Preview {
  title?: string;
  excerpt?: string;
  thumbnail?: string;
  siteName?: string;
  readTimeMinutes?: number;
}

function domainOf(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function looksLikeUrl(v: string): boolean {
  const t = v.trim();
  return /^https?:\/\/\S+\.\S+/.test(t);
}

export default function ReadingsClient({
  readings,
  initiatives,
}: {
  readings: Reading[];
  initiatives: WorkspaceOption[];
}) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [, startStatus] = useTransition();

  // Quick capture
  const [url, setUrl] = useState("");
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewSeq = useRef(0);

  // Filters
  const [query, setQuery] = useState("");
  const [filterWorkspace, setFilterWorkspace] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const wsName = useMemo(
    () => new Map(initiatives.map((i) => [i.id, i.name])),
    [initiatives]
  );

  // Debounced preview of the pasted URL (optional, best-effort).
  useEffect(() => {
    if (!looksLikeUrl(url)) {
      setPreview(null);
      setPreviewing(false);
      return;
    }
    const seq = ++previewSeq.current;
    setPreviewing(true);
    const t = window.setTimeout(async () => {
      const r = await previewReadingUrl(url);
      if (seq !== previewSeq.current) return; // a newer input superseded this
      setPreviewing(false);
      setPreview(
        r.ok
          ? {
              title: r.title,
              excerpt: r.excerpt,
              thumbnail: r.thumbnail,
              siteName: r.siteName,
              readTimeMinutes: r.readTimeMinutes,
            }
          : null
      );
    }, 600);
    return () => window.clearTimeout(t);
  }, [url]);

  const submit = () => {
    setFormMsg(null);
    startSave(async () => {
      const r = await createReading({ url, tags: [], status: "Por ler" });
      setFormMsg(r.message);
      if (r.ok) {
        setUrl("");
        setPreview(null);
        router.refresh();
      }
    });
  };

  const changeStatus = (id: string, next: string) => {
    startStatus(async () => {
      await setReadingStatus(id, next);
      router.refresh();
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return readings.filter((r) => {
      if (filterWorkspace && r.workspaceId !== filterWorkspace) return false;
      if (filterTag && !r.tags.includes(filterTag)) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (q) {
        const hay = [r.title, r.url, r.note, r.excerpt, ...(r.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [readings, query, filterWorkspace, filterTag, filterStatus]);

  return (
    <div>
      {/* Quick capture — single line */}
      <div className="readings-capture">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim() && !saving) submit();
          }}
          placeholder="Cola um link…"
          className="readings-capture-input"
        />
        <button
          type="button"
          className="readings-capture-btn"
          onClick={submit}
          disabled={saving || !url.trim()}
        >
          {saving ? "A guardar…" : "Guardar"}
        </button>
      </div>

      {previewing ? (
        <p className="readings-capture-hint">A obter pré-visualização…</p>
      ) : preview ? (
        <div className="readings-preview">
          {preview.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.thumbnail} alt="" className="readings-preview-thumb" />
          ) : null}
          <div className="readings-preview-body">
            <p className="readings-preview-title">
              {preview.title || domainOf(url) || url}
            </p>
            {preview.excerpt ? (
              <p className="readings-preview-excerpt">{preview.excerpt}</p>
            ) : null}
            <p className="readings-preview-meta">
              {[
                preview.siteName || domainOf(url),
                preview.readTimeMinutes
                  ? `${preview.readTimeMinutes} min de leitura`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      ) : null}
      {formMsg ? <p className="readings-capture-hint">{formMsg}</p> : null}

      {/* Filters */}
      <section className="readings-filters">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar leituras…"
          className="readings-filter-input"
        />
        <select
          value={filterWorkspace}
          onChange={(e) => setFilterWorkspace(e.target.value)}
          className="readings-filter-select"
        >
          <option value="">Todos os workspaces</option>
          {initiatives.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="readings-filter-select"
        >
          <option value="">Todas as etiquetas</option>
          {READING_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="readings-filter-select"
        >
          <option value="">Todos os estados</option>
          {READING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </section>

      {/* List */}
      {readings.length === 0 ? (
        <div className="readings-empty">
          <p className="readings-empty-title">
            Ainda não guardaste nenhuma leitura.
          </p>
          <p className="readings-empty-sub">
            Cola um link acima para o rever mais tarde ou usar como fonte.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="readings-empty-sub italic">
          Nenhuma leitura corresponde aos filtros.
        </p>
      ) : (
        <ul className="readings-list">
          {filtered.map((r) => {
            const source = r.siteName || domainOf(r.url);
            const metaBits = [
              source,
              r.readTimeMinutes ? `${r.readTimeMinutes} min de leitura` : null,
            ].filter(Boolean);
            return (
              <li key={r.id} className="readings-row">
                <div className="readings-row-main">
                  <Link href={`/readings/${r.id}`} className="readings-row-title">
                    {r.title || r.url || "Sem título"}
                  </Link>
                  {metaBits.length ? (
                    <p className="readings-row-meta">{metaBits.join(" · ")}</p>
                  ) : null}
                  {r.excerpt ? (
                    <p className="readings-row-excerpt">{r.excerpt}</p>
                  ) : r.note ? (
                    <p className="readings-row-excerpt">{r.note}</p>
                  ) : null}
                  <div className="readings-row-footer">
                    {r.tags.map((t) => (
                      <span key={t} className="readings-tag">
                        {t}
                      </span>
                    ))}
                    {r.workspaceId ? (
                      <span className="readings-row-ws">
                        {wsName.get(r.workspaceId) ?? "—"}
                      </span>
                    ) : null}
                    <Link
                      href={`/readings/${r.id}`}
                      className="readings-row-open"
                    >
                      Abrir →
                    </Link>
                  </div>
                </div>

                <div className="readings-row-aside">
                  {r.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbnail}
                      alt=""
                      className="readings-row-thumb"
                      loading="lazy"
                    />
                  ) : null}
                  <select
                    value={r.status}
                    onChange={(e) => changeStatus(r.id, e.target.value)}
                    className="readings-row-status"
                    aria-label="Estado da leitura"
                  >
                    {READING_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
