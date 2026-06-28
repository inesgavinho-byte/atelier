"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importContext } from "@/app/(main)/workspaces/[workspaceId]/import-actions";

const SOURCES = [
  { value: "claude", label: "Claude" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "perplexity", label: "Perplexity" },
  { value: "other", label: "Outro" },
];

/**
 * "Importar contexto" — a header button that opens a drawer to bring a
 * conversation from another LLM into the workspace. Two methods: paste text
 * (A) or upload an exported JSON file (B). On success the context panel
 * refreshes with the merged memory.
 */
export default function ImportContext({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("claude");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setText("");
    setFileName(null);
    setFileContent(null);
    setMsg(null);
    setOk(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileContent(await file.text());
    setMsg(null);
  };

  const submit = () => {
    setMsg(null);
    setOk(false);
    const useJson = Boolean(fileContent);
    const content = useJson ? (fileContent as string) : text;
    if (!content.trim()) {
      setMsg("Cola a conversa ou escolhe um ficheiro JSON.");
      return;
    }
    startTransition(async () => {
      const r = await importContext({
        workspaceId,
        source,
        content,
        kind: useJson ? "json" : "text",
      });
      setMsg(r.message);
      setOk(r.ok);
      if (r.ok) {
        setText("");
        setFileName(null);
        setFileContent(null);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="ws-header-chip"
        onClick={() => setOpen(true)}
      >
        Importar contexto
      </button>

      {open ? (
        <>
          <div className="import-drawer-backdrop" onClick={close} />
          <aside
            className="import-drawer"
            role="dialog"
            aria-label="Importar contexto"
          >
            <header className="import-drawer-header">
              <h2 className="import-drawer-title">Importar contexto</h2>
              <button type="button" className="import-btn-quiet" onClick={close}>
                Fechar
              </button>
            </header>

            <div className="import-drawer-body">
              <p className="import-hint">
                Traz uma conversa de outra IA para a memória deste workspace. O
                agente de contexto extrai decisões, artefactos e lições.
              </p>

              <label className="import-field">
                <span className="import-label">Origem</span>
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="import-field">
                <span className="import-label">Colar a conversa</span>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (fileContent) {
                      setFileContent(null);
                      setFileName(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }
                  }}
                  rows={10}
                  placeholder="Cola aqui o texto da conversa…"
                  disabled={Boolean(fileContent)}
                />
              </div>

              <div className="import-or">ou</div>

              <div className="import-field">
                <span className="import-label">Ficheiro JSON exportado</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={onFile}
                />
                {fileName ? (
                  <span className="import-file-name">{fileName}</span>
                ) : (
                  <span className="import-file-hint">
                    Claude.ai ou ChatGPT → Settings → Export data.
                  </span>
                )}
              </div>

              {msg ? (
                <p className={`import-msg${ok ? " import-msg-ok" : ""}`}>{msg}</p>
              ) : null}
            </div>

            <footer className="import-drawer-footer">
              <button
                type="button"
                className="import-btn"
                onClick={submit}
                disabled={pending}
              >
                {pending ? "A importar…" : "Importar"}
              </button>
            </footer>
          </aside>
        </>
      ) : null}
    </>
  );
}
