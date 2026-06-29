"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "@/components/Markdown";
import { ago } from "@/components/mission/bits";
import { estimateCostUSD, formatCostUSD } from "@/lib/ai/cost";
import { isComplexQuestion } from "@/lib/ai-runtime/classifier";
import { sendCouncilDebate } from "@/app/(main)/workspaces/[workspaceId]/actions";

/**
 * WorkspaceChat — the continuous workspace conversation (ADR-0004).
 *
 * A Claude.ai-style window: a scrollable transcript above a fixed input row.
 * The Council picks the model server-side, so there is no provider/model/mode
 * selector here. Replies stream in token by token via the chat-stream route; a
 * trailing metadata line carries tokens, Perplexity sources and next steps.
 */

type NextStep = { action: string; why: string; effort: "S" | "M" | "L" };
type Perspective = { provider: string; label: string; model: string; text: string };
type DocSource = { documentId: string; documentTitle: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  taskType?: string;
  tokens?: number | null;
  citations?: string[];
  sources?: DocSource[];
  steps?: NextStep[];
  debate?: Perspective[];
};

/** Separates the streamed text from the trailing JSON metadata line. */
const META_MARKER = "[[ATELIER_META]]";

/** pt-PT labels for each task type (routing is otherwise invisible). */
const TASK_LABELS: Record<string, string> = {
  search: "pesquisa",
  code: "código",
  writing: "escrita",
  planning: "planeamento",
  brainstorming: "brainstorming",
  summary: "resumo",
  reasoning: "análise",
  general: "geral",
  complex: "debate",
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function WorkspaceChat({
  workspaceId,
  workspaceName,
  projectId,
  initialMessages,
  contextVersion,
  contextUpdatedAt,
}: {
  workspaceId: string;
  workspaceName: string;
  /** When set, the chat is the project's continuous conversation. */
  projectId?: string;
  initialMessages: ChatMessage[];
  contextVersion?: number;
  contextUpdatedAt?: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, Math.max(40, el.scrollHeight))}px`;
  }

  async function send(override?: string) {
    const content = (override ?? input).trim();
    if (!content || pending) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content },
    ]);
    if (override === undefined) setInput("");
    setError(null);
    setPending(true);
    requestAnimationFrame(resizeTextarea);

    const assistantId = `assistant-${Date.now()}`;
    try {
      const res = await fetch(`/workspaces/${workspaceId}/chat-stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, projectId }),
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        setError(txt || "Falha ao enviar a mensagem.");
        setPending(false);
        return;
      }

      const model = res.headers.get("x-model") ?? undefined;
      const taskType = res.headers.get("x-task-type") ?? undefined;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", model, taskType },
      ]);
      setPending(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        // Show only the text before the metadata marker while streaming.
        const visible = raw.split(META_MARKER)[0];
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: visible } : m
          )
        );
      }

      // Parse the trailing metadata line (tokens / sources / next steps).
      const idx = raw.indexOf(META_MARKER);
      if (idx >= 0) {
        const text = raw.slice(0, idx).trimEnd();
        try {
          const meta = JSON.parse(raw.slice(idx + META_MARKER.length)) as {
            tokens?: number | null;
            model?: string;
            taskType?: string;
            citations?: string[];
            sources?: DocSource[];
            steps?: NextStep[];
          };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: text,
                    tokens: meta.tokens ?? null,
                    model: meta.model ?? m.model,
                    taskType: meta.taskType ?? m.taskType,
                    citations: meta.citations ?? [],
                    sources: meta.sources ?? [],
                    steps: meta.steps ?? [],
                  }
                : m
            )
          );
        } catch {
          /* leave the streamed text as-is */
        }
      }
    } catch {
      setError("Falha ao enviar a mensagem.");
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  /** Run the full Council (parallel panel + synthesis). Non-streaming. */
  async function debate() {
    const content = input.trim();
    if (!content || pending) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content },
    ]);
    setInput("");
    setError(null);
    setPending(true);
    requestAnimationFrame(resizeTextarea);

    try {
      const r = await sendCouncilDebate(workspaceId, content, projectId);
      if (r.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: r.synthesis ?? "",
            model: r.model,
            taskType: "complex",
            debate: r.perspectives ?? [],
            sources: r.sources ?? [],
          },
        ]);
      } else {
        setError(r.error ?? "Falha no Council completo.");
      }
    } catch {
      setError("Falha no Council completo.");
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const canSend = input.trim().length > 0 && !pending;
  const showContextLine = typeof contextVersion === "number";
  const suggestDebate = isComplexQuestion(input);

  return (
    <div className="ws-chat">
      <div className="ws-chat-scroll">
        {messages.length === 0 && !pending ? (
          <div className="ws-chat-empty">
            Começa a conversa com o teu workspace.
          </div>
        ) : (
          messages.map((m) => {
            const cost =
              m.role === "assistant"
                ? formatCostUSD(estimateCostUSD(m.model, m.tokens))
                : null;
            return (
              <div key={m.id} className={`ws-msg ${m.role}`}>
                <div className="ws-msg-bubble">
                  {m.role === "assistant" ? (
                    <>
                      <div className="ws-msg-head">
                        <span className="ws-dot-council" />
                        <span>
                          Council{m.model ? ` · ${m.model}` : ""}
                          {m.taskType && TASK_LABELS[m.taskType]
                            ? ` · ${TASK_LABELS[m.taskType]}`
                            : ""}
                          {m.tokens ? ` · ${m.tokens} tokens` : ""}
                          {cost ? ` · ${cost}` : ""}
                        </span>
                      </div>

                      {m.debate && m.debate.length > 0 ? (
                        <details className="ws-debate" open>
                          <summary>
                            Perspectivas do painel ({m.debate.length})
                          </summary>
                          <div className="ws-debate-grid">
                            {m.debate.map((p, i) => (
                              <div key={i} className="ws-debate-card">
                                <p className="ws-debate-label">{p.label}</p>
                                <Markdown content={p.text} />
                              </div>
                            ))}
                          </div>
                          <p className="ws-debate-synth-label">Síntese</p>
                        </details>
                      ) : null}

                      <Markdown content={m.content} />

                      {m.citations && m.citations.length > 0 ? (
                        <details className="ws-sources">
                          <summary>Fontes ({m.citations.length})</summary>
                          <ul>
                            {m.citations.map((url, i) => (
                              <li key={i}>
                                <a href={url} target="_blank" rel="noreferrer">
                                  <span className="ws-source-host">
                                    {hostOf(url)}
                                  </span>
                                  <span className="ws-source-url">{url}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}

                      {m.sources && m.sources.length > 0 ? (
                        <details className="ws-sources ws-docsources">
                          <summary>
                            Documentos consultados ({m.sources.length})
                          </summary>
                          <ul>
                            {m.sources.map((s) => (
                              <li key={s.documentId}>
                                <span className="ws-source-host">
                                  {s.documentTitle}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}

                      {m.steps && m.steps.length > 0 ? (
                        <div className="ws-steps">
                          <p className="ws-steps-title">Próximos passos</p>
                          {m.steps.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              className="ws-step"
                              onClick={() => void send(s.action)}
                              disabled={pending}
                            >
                              <span className="ws-step-arrow">→</span>
                              <span className="ws-step-body">
                                <span className="ws-step-action">{s.action}</span>
                                {s.why ? (
                                  <span className="ws-step-why">{s.why}</span>
                                ) : null}
                              </span>
                              <span className="ws-step-effort">{s.effort}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="ws-msg-text">{m.content}</p>
                  )}
                </div>
              </div>
            );
          })
        )}

        {pending ? (
          <div className="ws-msg assistant">
            <div className="ws-msg-bubble">
              <div className="ws-msg-head">
                <span className="ws-dot-council" />
                <span>Council</span>
              </div>
              <div className="ws-typing" aria-label="a pensar">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {error ? <p className="ws-chat-error">{error}</p> : null}

      <div className="ws-chat-foot">
        {showContextLine ? (
          <p className="ws-context-line">
            Contexto {workspaceName} v{contextVersion} · sessão contínua
            {contextUpdatedAt ? ` · actualizado ${ago(contextUpdatedAt)}` : ""}
          </p>
        ) : null}
        <div className="ws-chat-input">
          <textarea
            ref={textareaRef}
            className="ws-chat-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={resizeTextarea}
            onKeyDown={onKeyDown}
            placeholder="Escreve uma mensagem…"
            rows={1}
            disabled={pending}
          />
          <button
            type="button"
            className={`ws-debate-btn${suggestDebate ? " suggest" : ""}`}
            onClick={() => void debate()}
            disabled={!canSend}
            title="Council completo — várias IAs debatem e sintetizam"
          >
            ⚖︎ Council completo
          </button>
          <button
            type="button"
            className="btn-primary ws-send"
            onClick={() => void send()}
            disabled={!canSend}
            aria-label="Enviar"
          >
            ↑
          </button>
        </div>
        {suggestDebate ? (
          <p className="ws-debate-hint">
            Pergunta com vários ângulos — experimenta o Council completo.
          </p>
        ) : null}
      </div>
    </div>
  );
}
