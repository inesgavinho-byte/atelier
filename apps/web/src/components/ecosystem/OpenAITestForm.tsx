"use client";

import { useState, useTransition } from "react";
import {
  runOpenAIPrompt,
  saveOpenAICapture,
} from "@/app/(main)/ecosystem/actions";

interface InitiativeOption {
  id: string;
  name: string;
}

/**
 * Minimal OpenAI test form for the connector detail view: send a prompt,
 * receive a response, optionally associate it with an initiative, and save the
 * result as a capture. No chat UI, no memory — just proof the call + store path
 * works end to end.
 */
export default function OpenAITestForm({
  initiatives,
  configured,
}: {
  initiatives: InitiativeOption[];
  configured: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [initiativeId, setInitiativeId] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [running, startRun] = useTransition();
  const [saving, startSave] = useTransition();

  const run = () => {
    setError(null);
    setSaveMsg(null);
    setResponse(null);
    startRun(async () => {
      const r = await runOpenAIPrompt(prompt);
      if (r.ok) setResponse(r.text ?? "");
      else setError(r.error ?? "Falha desconhecida.");
    });
  };

  const save = () => {
    if (response == null) return;
    setSaveMsg(null);
    startSave(async () => {
      const r = await saveOpenAICapture({
        prompt,
        response,
        workspaceId: initiativeId || undefined,
      });
      setSaveMsg(r.message);
    });
  };

  return (
    <div className="panel mt-8 p-6">
      <h2 className="font-serif text-2xl">Teste rápido</h2>
      {!configured ? (
        <p className="meta mt-2">
          Define OPENAI_API_KEY no ambiente para correr um pedido real. Sem a
          chave, o teste devolve “Credenciais em falta”.
        </p>
      ) : null}

      <div className="mt-5">
        <label htmlFor="prompt" className="eyebrow mb-2 block">
          Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Escreve um prompt…"
          className="w-full border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="initiative" className="eyebrow mb-2 block">
          Workspace (opcional)
        </label>
        <select
          id="initiative"
          value={initiativeId}
          onChange={(e) => setInitiativeId(e.target.value)}
          className="w-full border border-line bg-surface px-3 py-2 text-[15px] text-charcoal focus:border-charcoal focus:outline-none"
        >
          <option value="">— Nenhuma —</option>
          {initiatives.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="action"
          onClick={run}
          disabled={running || !prompt.trim()}
        >
          {running ? "A correr…" : "Correr teste"}
        </button>
        <button
          type="button"
          className="action"
          onClick={save}
          disabled={saving || response == null}
        >
          {saving ? "A guardar…" : "Guardar resultado"}
        </button>
      </div>

      {error ? (
        <p className="meta mt-4 font-mono text-[12px] break-words">{error}</p>
      ) : null}

      {response != null ? (
        <div className="mt-5">
          <p className="eyebrow mb-2">Resposta</p>
          <div className="whitespace-pre-wrap border border-line bg-surface p-4 text-[14.5px] leading-relaxed text-charcoal">
            {response}
          </div>
        </div>
      ) : null}

      {saveMsg ? <p className="meta mt-3">{saveMsg}</p> : null}
    </div>
  );
}
