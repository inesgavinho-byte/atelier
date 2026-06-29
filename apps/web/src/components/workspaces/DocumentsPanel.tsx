"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ago } from "@/components/mission/bits";
import {
  addDocument,
  deleteDocument,
  searchWorkspaceDocuments,
} from "@/app/(main)/workspaces/[workspaceId]/document-actions";
import type { WorkspaceDocument } from "@/lib/documents";

/** Extensions we can read as text in the browser (Node-first pipeline). */
const TEXT_EXT = ["txt", "md", "markdown", "csv", "json", "log", "text"];

/** Binaries above this size aren't sent inline (server-action payload limit). */
const MAX_BINARY_BYTES = 4 * 1024 * 1024;

type Hit = { documentId: string; documentTitle: string; idx: number; content: string };

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** ArrayBuffer → base64, chunked so large buffers don't blow the call stack. */
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk) as unknown as number[];
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}

/**
 * "Documentos" — upload (drag & drop) + library + keyword search for a
 * workspace. Text files are processed immediately (Markdown + chunks); binaries
 * are queued for the MarkItDown service.
 */
export default function DocumentsPanel({
  workspaceId,
  documents,
}: {
  workspaceId: string;
  documents: WorkspaceDocument[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, startSearch] = useTransition();

  const ingest = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const kind = extOf(file.name);
      const isText = TEXT_EXT.includes(kind);
      const base = {
        workspaceId,
        title: file.name.replace(/\.[^.]+$/, ""),
        sourceName: file.name,
        kind,
      };
      if (isText) {
        const r = await addDocument({ ...base, text: await file.text() });
        setMsg(r.message);
      } else if (file.size > MAX_BINARY_BYTES) {
        // Too large to send inline; queue without bytes (stays pending).
        const r = await addDocument(base);
        setMsg(`${file.name}: demasiado grande para conversão directa (>4 MB). ${r.message}`);
      } else {
        // Binary → base64 → MarkItDown service (server-side). Degrades to
        // pending_conversion when the service isn't configured.
        const r = await addDocument({
          ...base,
          base64: toBase64(await file.arrayBuffer()),
          mime: file.type || undefined,
        });
        setMsg(r.message);
      }
    }
    router.refresh();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) start(() => ingest(e.dataTransfer.files));
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) start(() => ingest(e.target.files as FileList));
  };

  const runSearch = () => {
    if (query.trim().length < 2) {
      setHits(null);
      return;
    }
    startSearch(async () => {
      setHits(await searchWorkspaceDocuments(workspaceId, query));
    });
  };

  const remove = (id: string) =>
    start(async () => {
      await deleteDocument({ id, workspaceId });
      router.refresh();
    });

  return (
    <section className="ws-docs">
      <h2 className="eyebrow mb-3">Documentos</h2>

      <div
        className={`ws-docs-drop${dragging ? " dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={onPick}
        />
        <p className="ws-docs-drop-title">
          {busy ? "A processar…" : "Arrasta ficheiros ou clica para carregar"}
        </p>
        <p className="ws-docs-drop-sub">
          .txt .md .csv .json processados já; PDF/Word/Excel convertidos pelo
          MarkItDown (ou em fila se o serviço estiver desligado).
        </p>
      </div>
      {msg ? <p className="meta mt-2">{msg}</p> : null}

      {/* Search */}
      <div className="ws-docs-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
          placeholder="Procurar nos documentos…"
          className="ws-docs-search-input"
        />
        <button
          type="button"
          className="action"
          onClick={runSearch}
          disabled={searching}
        >
          {searching ? "…" : "Procurar"}
        </button>
      </div>

      {hits !== null ? (
        hits.length === 0 ? (
          <p className="ctx-empty mt-2">Sem resultados.</p>
        ) : (
          <ul className="ws-docs-hits">
            {hits.map((h, i) => (
              <li key={`${h.documentId}-${h.idx}-${i}`} className="ws-docs-hit">
                <span className="ws-docs-hit-doc">{h.documentTitle}</span>
                <span className="ws-docs-hit-text">{h.content.slice(0, 240)}…</span>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {/* Library */}
      {documents.length === 0 ? (
        <p className="ctx-empty mt-3">Ainda não há documentos.</p>
      ) : (
        <ul className="ws-docs-list">
          {documents.map((d) => (
            <li key={d.id} className="ws-docs-item">
              <span className="ws-docs-item-main">
                <span className="ws-docs-item-title">{d.title}</span>
                <span className="ws-docs-item-meta">
                  {d.status === "pending_conversion"
                    ? "em fila (conversão)"
                    : `${d.charCount.toLocaleString("pt-PT")} car.`}
                  {` · ${ago(d.createdAt)}`}
                </span>
              </span>
              <button
                type="button"
                className="ws-docs-del"
                onClick={() => remove(d.id)}
                disabled={busy}
                aria-label="Eliminar documento"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
