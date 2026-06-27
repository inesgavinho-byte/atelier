"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CHAT_PROVIDERS } from "@/lib/workspaces-constants";
import {
  runMessageWithOpenAI,
  sendMessage,
} from "@/app/(main)/workspaces/actions";

/**
 * Chat composer. Saves a manual message to the thread; when the OpenAI
 * connector is configured, optionally runs the message through OpenAI and
 * stores the reply in the same thread. The context belongs to ATELIER — the
 * provider is only metadata.
 */
export default function ChatComposer({
  chatId,
  defaultProvider,
  openaiConfigured,
}: {
  chatId: string;
  defaultProvider: string;
  openaiConfigured: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [provider, setProvider] = useState(defaultProvider || "ATELIER");
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

  const runOpenAI = () => {
    setMsg(null);
    start(async () => {
      const r = await runMessageWithOpenAI({ chatId, content });
      setMsg(r.message);
      if (r.ok) {
        setContent("");
      }
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
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="border border-line bg-surface px-3 py-2 text-[14px] text-charcoal focus:border-charcoal focus:outline-none"
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
          onClick={save}
          disabled={busy || !content.trim()}
        >
          {busy ? "A guardar…" : "Guardar mensagem"}
        </button>
        {openaiConfigured ? (
          <button
            type="button"
            className="action"
            onClick={runOpenAI}
            disabled={busy || !content.trim()}
          >
            {busy ? "…" : "Correr com OpenAI"}
          </button>
        ) : null}
        {msg ? <span className="meta">{msg}</span> : null}
      </div>
      {!openaiConfigured ? (
        <p className="meta mt-3">
          Define OPENAI_API_KEY no ambiente para correr mensagens com OpenAI. Por
          agora, as mensagens são guardadas manualmente.
        </p>
      ) : null}
    </div>
  );
}
