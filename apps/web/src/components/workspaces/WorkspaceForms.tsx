"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CHAT_PROVIDERS } from "@/lib/workspaces-constants";
import {
  archiveWorkspace,
  createChat,
  createProject,
  renameWorkspace,
} from "@/app/(main)/workspaces/actions";

const field =
  "w-full border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none";

/** Create a project inside a workspace. */
export function NewProjectForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const submit = () => {
    setMsg(null);
    start(async () => {
      const r = await createProject({ workspaceId, name, description });
      if (r.ok && r.id) {
        router.push(`/workspaces/${workspaceId}/projects/${r.id}`);
      } else setMsg(r.message);
    });
  };

  return (
    <div className="grid gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do projeto"
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
          {saving ? "A criar…" : "Criar projeto"}
        </button>
        {msg ? <span className="meta">{msg}</span> : null}
      </div>
    </div>
  );
}

/** Create a chat in a workspace (optionally inside a project). */
export function NewChatForm({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState<string>("ATELIER");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const submit = () => {
    setMsg(null);
    start(async () => {
      const r = await createChat({ workspaceId, projectId, title, provider });
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
        placeholder="Título do chat"
        className={field}
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none"
        >
          {CHAT_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="action"
          onClick={submit}
          disabled={saving}
        >
          {saving ? "A criar…" : "Criar chat"}
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
