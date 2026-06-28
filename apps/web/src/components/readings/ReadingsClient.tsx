"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  READING_STATUSES,
  READING_TAGS,
  type Reading,
} from "@/lib/readings-constants";
import { createReading, setReadingStatus } from "@/app/(main)/readings/actions";

interface InitiativeOption {
  id: string;
  name: string;
}

export default function ReadingsClient({
  readings,
  initiatives,
}: {
  readings: Reading[];
  initiatives: InitiativeOption[];
}) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [, startStatus] = useTransition();

  // Create form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [initiativeId, setInitiativeId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("Por ler");
  const [formMsg, setFormMsg] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [filterInitiative, setFilterInitiative] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const iniName = useMemo(
    () => new Map(initiatives.map((i) => [i.id, i.name])),
    [initiatives]
  );

  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const submit = () => {
    setFormMsg(null);
    startSave(async () => {
      const r = await createReading({
        url,
        title,
        note,
        workspaceId: initiativeId || undefined,
        tags,
        status,
      });
      setFormMsg(r.message);
      if (r.ok) {
        setUrl("");
        setTitle("");
        setNote("");
        setInitiativeId("");
        setTags([]);
        setStatus("Por ler");
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
      if (filterInitiative && r.workspaceId !== filterInitiative) return false;
      if (filterTag && !r.tags.includes(filterTag)) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (q) {
        const hay = [r.title, r.url, r.note, ...(r.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [readings, query, filterInitiative, filterTag, filterStatus]);

  const field =
    "w-full border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none";

  return (
    <div>
      {/* Create */}
      <section className="panel mb-12 p-6">
        <h2 className="font-serif text-2xl">Guardar leitura</h2>
        <div className="mt-5 grid gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cola um link…"
            className={field}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título (opcional)"
              className={field}
            />
            <select
              value={initiativeId}
              onChange={(e) => setInitiativeId(e.target.value)}
              className={field}
            >
              <option value="">— Workspace (opcional) —</option>
              {initiatives.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Nota (opcional)"
            className={field}
          />

          <div>
            <p className="eyebrow mb-2">Etiquetas</p>
            <div className="flex flex-wrap gap-2">
              {READING_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`border px-3 py-1.5 text-[13px] transition-colors ${
                    tags.includes(tag)
                      ? "border-charcoal bg-charcoal text-cream"
                      : "border-line-strong text-charcoal hover:border-charcoal"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none"
            >
              {READING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="action"
              onClick={submit}
              disabled={saving || !url.trim()}
            >
              {saving ? "A guardar…" : "Guardar leitura"}
            </button>
            {formMsg ? <span className="meta">{formMsg}</span> : null}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar leituras…"
          className={field}
        />
        <select
          value={filterInitiative}
          onChange={(e) => setFilterInitiative(e.target.value)}
          className={field}
        >
          <option value="">Todas as iniciativas</option>
          {initiatives.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className={field}
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
          className={field}
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
        <div className="panel p-10 text-center">
          <p className="font-serif text-2xl text-charcoal">
            Ainda não guardaste nenhuma leitura.
          </p>
          <p className="meta mt-2">
            Cola um link para o rever mais tarde ou usar como fonte.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="meta italic">Nenhuma leitura corresponde aos filtros.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {filtered.map((r) => (
            <li key={r.id} className="py-5">
              <div className="flex items-baseline justify-between gap-4">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-serif text-xl text-charcoal underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-charcoal"
                  >
                    {r.title || r.url}
                  </a>
                ) : (
                  <span className="font-serif text-xl text-charcoal">
                    {r.title || "Sem título"}
                  </span>
                )}
                <select
                  value={r.status}
                  onChange={(e) => changeStatus(r.id, e.target.value)}
                  className="shrink-0 border border-line bg-surface px-2 py-1 text-[12.5px] text-charcoal focus:border-charcoal focus:outline-none"
                >
                  {READING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {r.title && r.url ? (
                <p className="meta mt-1 break-all">{r.url}</p>
              ) : null}
              {r.note ? (
                <p className="mt-2 text-[14px] text-charcoal/90">{r.note}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                {r.workspaceId ? (
                  <span className="meta">
                    {iniName.get(r.workspaceId) ?? "—"}
                  </span>
                ) : null}
                {r.tags.map((t) => (
                  <span
                    key={t}
                    className="border border-line px-2 py-0.5 text-[11.5px] text-muted"
                  >
                    {t}
                  </span>
                ))}
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="action-quiet ml-auto"
                  >
                    Abrir →
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
