"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runChatMessage, sendMessage } from "@/app/(main)/workspaces/actions";

/**
 * Chat composer. Saves a manual message to the thread; when the chat's provider
 * is an available gateway engine, runs the message through the gateway and
 * stores the reply in the same thread. ATELIER calls only the gateway — the
 * provider is the execution engine, the context stays in ATELIER.
 */
export default function ChatComposer({
  chatId,
  provider,
  runnable,
}: {
  chatId: string;
  provider: string;
  runnable: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const save = () => {
    setMsg(null);
    start(async () => {
      const r = await sendMessage({ chatId, content, provider });
      setMsg(r.message);
      if (r.ok) {
        setContent("");
        router.refresh();
      }
    });
  };

  const run = () => {
    setMsg(null);
    start(async () => {
      const r = await runChatMessage({ chatId, content });
      setMsg(r.message);
      if (r.ok) setContent("");
      router.refresh();
    });
  };

  return (
    <div className="panel mt-8 p-5">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder="Escreve uma mensagem…"
        className="w-full border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="action"
          onClick={save}
          disabled={busy || !content.trim()}
        >
          {busy ? "A guardar…" : "Guardar mensagem"}
        </button>
        {runnable ? (
          <button
            type="button"
            className="action"
            onClick={run}
            disabled={busy || !content.trim()}
          >
            {busy ? "…" : `Correr com ${provider}`}
          </button>
        ) : null}
        {msg ? <span className="meta">{msg}</span> : null}
      </div>
      {!runnable ? (
        <p className="meta mt-3">
          O provider “{provider}” não está disponível para execução (credenciais
          em falta ou provider manual). As mensagens são guardadas como notas.
        </p>
      ) : null}
    </div>
  );
}
