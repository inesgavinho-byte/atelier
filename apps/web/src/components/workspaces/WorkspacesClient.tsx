"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/lib/workspaces-constants";
import { createWorkspace } from "@/app/(main)/workspaces/actions";

export default function WorkspacesClient({
  workspaces,
}: {
  workspaces: Workspace[];
}) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const field =
    "w-full border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none";

  const submit = () => {
    setMsg(null);
    startSave(async () => {
      const r = await createWorkspace({ name, description });
      if (r.ok && r.id) {
        router.push(`/workspaces/${r.id}`);
      } else {
        setMsg(r.message);
      }
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) =>
      [w.name, w.description].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [workspaces, query]);

  return (
    <div>
      <section className="panel mb-12 p-6">
        <h2 className="font-serif text-2xl">Criar workspace</h2>
        <div className="mt-5 grid gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (ex.: PAPERS, Pessoal, Experiências)"
            className={field}
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className={field}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="action"
              onClick={submit}
              disabled={saving || !name.trim()}
            >
              {saving ? "A criar…" : "Criar workspace"}
            </button>
            {msg ? <span className="meta">{msg}</span> : null}
          </div>
        </div>
      </section>

      {workspaces.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="font-serif text-2xl text-charcoal">
            Ainda não existem workspaces.
          </p>
          <p className="meta mt-2">
            Cria um espaço para concentrar projetos, chats e contexto.
          </p>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar workspaces…"
            className={`${field} mb-6`}
          />
          <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((w) => (
              <Link
                key={w.id}
                href={`/workspaces/${w.id}`}
                className="group border-b border-r border-line bg-cream p-6 transition-colors hover:bg-surface"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-2xl text-charcoal transition-colors group-hover:text-olive">
                    {w.name}
                  </span>
                  {w.status !== "Ativo" ? (
                    <span className="meta shrink-0">{w.status}</span>
                  ) : null}
                </div>
                {w.description ? (
                  <p className="meta mt-2 line-clamp-2">{w.description}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
