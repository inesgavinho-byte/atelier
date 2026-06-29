"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "@/components/Markdown";
import { ago } from "@/components/mission/bits";
import { sendWorkspaceMessage } from "@/app/(main)/workspaces/[workspaceId]/actions";

/**
 * WorkspaceChat — the continuous workspace conversation (ADR-0004).
 *
 * A Claude.ai-style window: a scrollable transcript above a fixed input row.
 * The Council picks the model server-side, so there is no provider/model/mode
 * selector here. Sends optimistically, then reconciles with the persisted
 * state via router.refresh().
 */

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  taskType?: string;
};

/** pt-PT labels for each task type (routing is otherwise invisible). */
const TASK_LABELS: Record<string, string> = {
  search: "pesquisa",
  code: "código",
  writing: "escrita",
  planning: "planeamento",
  summary: "resumo",
  reasoning: "análise",
  general: "geral",
};

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

  // Keep the latest turn in view on mount and whenever the transcript grows
  // or the typing indicator toggles.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  // Auto-grow the textarea between min and max heights.
  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, Math.max(40, el.scrollHeight))}px`;
  }

  async function send() {
    const content = input.trim();
    if (!content || pending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);
    setPending(true);
    // Reset the textarea height once cleared.
    requestAnimationFrame(resizeTextarea);

    try {
      const result = await sendWorkspaceMessage(workspaceId, content, projectId);
      if (result.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: result.text ?? "",
            model: result.model,
            taskType: result.taskType,
          },
        ]);
      } else {
        setError(result.error ?? "Falha ao enviar a mensagem.");
      }
    } catch {
      setError("Falha ao enviar a mensagem.");
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

  return (
    <div className="ws-chat">
      <div className="ws-chat-scroll">
        {messages.length === 0 && !pending ? (
          <div className="ws-chat-empty">
            Começa a conversa com o teu workspace.
          </div>
        ) : (
          messages.map((m) => (
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
                      </span>
                    </div>
                    <Markdown content={m.content} />
                  </>
                ) : (
                  <p className="ws-msg-text">{m.content}</p>
                )}
              </div>
            </div>
          ))
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
            className="btn-primary ws-send"
            onClick={() => void send()}
            disabled={!canSend}
            aria-label="Enviar"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
