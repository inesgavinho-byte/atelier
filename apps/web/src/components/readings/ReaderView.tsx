"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { READING_STATUSES, type Reading } from "@/lib/readings-constants";
import {
  extractReadingContent,
  setReadingNote,
  setReadingStatus,
  setReadingWorkspace,
} from "@/app/(main)/readings/actions";

interface InitiativeOption {
  id: string;
  name: string;
}

function domainOf(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/**
 * The integrated reader. A narrow, centred, serif reading column with a minimal
 * header and a quiet action bar — no sidebar, no distractions. Renders the
 * sanitised reader-mode HTML stored on the reading.
 */
export default function ReaderView({
  reading,
  initiatives,
}: {
  reading: Reading;
  initiatives: InitiativeOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [extracting, startExtract] = useTransition();

  const [status, setStatus] = useState(reading.status);
  const [note, setNote] = useState(reading.note ?? "");
  const [workspaceId, setWorkspaceId] = useState(reading.workspaceId ?? "");
  const [copied, setCopied] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);

  const source = reading.siteName || domainOf(reading.url);
  const readTime = reading.readTimeMinutes
    ? `${reading.readTimeMinutes} min de leitura`
    : null;

  const changeStatus = (next: string) => {
    setStatus(next);
    startTransition(async () => {
      await setReadingStatus(reading.id, next);
      router.refresh();
    });
  };

  const saveNote = () => {
    setNoteSaved(false);
    startTransition(async () => {
      await setReadingNote(reading.id, note);
      setNoteSaved(true);
      window.setTimeout(() => setNoteSaved(false), 1800);
    });
  };

  const changeWorkspace = (next: string) => {
    setWorkspaceId(next);
    startTransition(async () => {
      await setReadingWorkspace(reading.id, next || null);
      router.refresh();
    });
  };

  const copyLink = async () => {
    if (!reading.url) return;
    try {
      await navigator.clipboard.writeText(reading.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const runExtract = () => {
    setExtractMsg(null);
    startExtract(async () => {
      const r = await extractReadingContent(reading.id);
      setExtractMsg(r.message);
      if (r.ok) router.refresh();
    });
  };

  return (
    <article className="reader">
      <header className="reader-header">
        <Link href="/readings" className="reader-back">
          ← Voltar
        </Link>
        <h1 className="reader-title">{reading.title || reading.url || "Leitura"}</h1>
        <div className="reader-meta">
          {reading.url ? (
            <a href={reading.url} target="_blank" rel="noreferrer">
              {source ?? reading.url}
            </a>
          ) : source ? (
            <span>{source}</span>
          ) : null}
          {readTime ? <span className="reader-meta-dot">·</span> : null}
          {readTime ? <span>{readTime}</span> : null}
          {reading.author ? <span className="reader-meta-dot">·</span> : null}
          {reading.author ? <span>{reading.author}</span> : null}
        </div>
      </header>

      <nav className="reader-actions" aria-label="Acções de leitura">
        <label className="reader-action-field">
          <span className="reader-action-label">Estado</span>
          <select value={status} onChange={(e) => changeStatus(e.target.value)}>
            {READING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="reader-action-field">
          <span className="reader-action-label">Workspace</span>
          <select
            value={workspaceId}
            onChange={(e) => changeWorkspace(e.target.value)}
          >
            <option value="">— Nenhum —</option>
            {initiatives.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>

        {reading.url ? (
          <button type="button" className="reader-action-btn" onClick={copyLink}>
            {copied ? "Copiado ✓" : "Copiar link"}
          </button>
        ) : null}
        {reading.url ? (
          <a
            href={reading.url}
            target="_blank"
            rel="noreferrer"
            className="reader-action-btn"
          >
            Abrir original ↗
          </a>
        ) : null}
      </nav>

      <div className="reader-body">
        {reading.content ? (
          <div
            className="reader-content"
            // Content is sanitised at extraction time (no scripts/iframes).
            dangerouslySetInnerHTML={{ __html: reading.content }}
          />
        ) : (
          <div className="reader-empty">
            {reading.excerpt ? (
              <p className="reader-lede">{reading.excerpt}</p>
            ) : null}
            {reading.note ? <p>{reading.note}</p> : null}
            <p className="reader-empty-note">
              {reading.url
                ? "Ainda não há conteúdo extraído para esta leitura."
                : "Esta leitura não tem URL de origem — abre-se a partir da nota."}
            </p>
            {reading.url ? (
              <button
                type="button"
                className="reader-action-btn"
                onClick={runExtract}
                disabled={extracting}
              >
                {extracting ? "A extrair…" : "Extrair conteúdo"}
              </button>
            ) : null}
            {extractMsg ? <p className="reader-empty-note">{extractMsg}</p> : null}
          </div>
        )}
      </div>

      <section className="reader-note">
        <label htmlFor="reader-note" className="reader-action-label">
          Nota
        </label>
        <textarea
          id="reader-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Escreve uma nota sobre esta leitura…"
        />
        <div className="reader-note-actions">
          <button type="button" className="reader-action-btn" onClick={saveNote}>
            Guardar nota
          </button>
          {noteSaved ? <span className="reader-saved">Guardado ✓</span> : null}
        </div>
      </section>
    </article>
  );
}
