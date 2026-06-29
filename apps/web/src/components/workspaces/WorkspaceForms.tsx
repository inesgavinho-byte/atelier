"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CHAT_PROVIDER_LABELS,
  PROVIDER_META,
  providerIdFromLabel,
} from "@/lib/ai/types";
import { WORK_MODES } from "@/lib/ai-runtime/types";
import {
  archiveWorkspace,
  createChat,
  createProject,
  renameWorkspace,
} from "@/app/(main)/workspaces/actions";

const field =
  "w-full border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none";

/** Create a project inside a workspace (name, description, GitHub repo). */
export function NewProjectForm({
  workspaceId,
  workspaceSlug,
  onCreated,
}: {
  workspaceId: string;
  /** Used to navigate after creation (falls back to the id). */
  workspaceSlug?: string;
  /** Called instead of navigating, e.g. to close an inline form. */
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const submit = () => {
    setMsg(null);
    start(async () => {
      const r = await createProject({
        workspaceId,
        name,
        description,
        githubRepo,
      });
      if (r.ok && r.id) {
        if (onCreated) onCreated();
        router.push(
          `/workspaces/${workspaceSlug ?? workspaceId}/projects/${r.id}`
        );
      } else setMsg(r.message);
    });
  };

  return (
    <div className="grid gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do projecto"
        className={field}
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        className={field}
      />
      <input
        type="text"
        value={githubRepo}
        onChange={(e) => setGithubRepo(e.target.value)}
        placeholder="Repositório GitHub — owner/repo (opcional)"
        className={field}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="action"
          onClick={submit}
          disabled={saving || !name.trim()}
        >
          {saving ? "A criar…" : "Criar projecto"}
        </button>
        {msg ? <span className="meta">{msg}</span> : null}
      </div>
    </div>
  );
}

/**
 * Create an AI session (a chat) in a workspace, optionally inside a project.
 * Flow: choose mode → provider → model → create. The mode binds the session to
 * a Skill; the provider/model are the execution engine.
 */
export function NewSessionForm({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<string>("livre");
  const [provider, setProvider] = useState<string>("OpenAI");
  const [model, setModel] = useState<string>(
    PROVIDER_META.find((m) => m.id === "openai")?.defaultModel ?? ""
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const meta = PROVIDER_META.find((m) => m.id === providerIdFromLabel(provider));
  const models = meta?.models ?? [];

  const submit = () => {
    setMsg(null);
    start(async () => {
      const r = await createChat({
        workspaceId,
        projectId,
        title,
        provider,
        mode,
        model: models.length ? model : undefined,
      });
      if (r.ok && r.id) {
        const base = projectId
          ? `/workspaces/${workspaceId}/projects/${projectId}`
          : `/workspaces/${workspaceId}`;
        router.push(`${base}/chats/${r.id}`);
      } else setMsg(r.message);
    });
  };

  return (
    <div className="grid gap-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da sessão"
        className={field}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none"
          aria-label="Modo de trabalho"
        >
          {WORK_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={provider}
          onChange={(e) => {
            const next = e.target.value;
            setProvider(next);
            const m = PROVIDER_META.find(
              (x) => x.id === providerIdFromLabel(next)
            );
            setModel(m?.defaultModel ?? "");
          }}
          className="border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none"
          aria-label="Provider"
        >
          {CHAT_PROVIDER_LABELS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {models.length ? (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none"
            aria-label="Modelo"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <div className="meta self-center">Sem modelo (provider manual)</div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="action"
          onClick={submit}
          disabled={saving}
        >
          {saving ? "A criar…" : "Criar sessão"}
        </button>
        {msg ? <span className="meta">{msg}</span> : null}
      </div>
    </div>
  );
}

/** Rename and archive controls for a workspace. */
export function WorkspaceAdmin({
  workspaceId,
  currentName,
  archived,
}: {
  workspaceId: string;
  currentName: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [busy, start] = useTransition();
  const [open, setOpen] = useState(false);

  const rename = () => {
    start(async () => {
      await renameWorkspace(workspaceId, name);
      setOpen(false);
      router.refresh();
    });
  };
  const archive = () => {
    start(async () => {
      await archiveWorkspace(workspaceId);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {open ? (
        <>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-line bg-surface px-3 py-1.5 text-[14px] text-charcoal focus:border-charcoal focus:outline-none"
          />
          <button
            type="button"
            className="action"
            onClick={rename}
            disabled={busy || !name.trim()}
          >
            Guardar
          </button>
          <button
            type="button"
            className="action-quiet"
            onClick={() => {
              setName(currentName);
              setOpen(false);
            }}
          >
            Cancelar
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="action-quiet"
            onClick={() => setOpen(true)}
          >
            Renomear
          </button>
          {!archived ? (
            <button
              type="button"
              className="action-quiet"
              onClick={archive}
              disabled={busy}
            >
              Arquivar
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
