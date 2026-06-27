import Link from "next/link";
import ChatComposer from "@/components/workspaces/ChatComposer";
import ChatSettings from "@/components/workspaces/ChatSettings";
import MessageActions from "@/components/workspaces/MessageActions";
import type { WorkspaceChat, WorkspaceMessage } from "@/lib/workspaces-constants";

/**
 * Presentational chat thread: a back link, settings, the message thread (with
 * per-message provider/model/token metadata and conversion actions) and the
 * composer. Shared by the workspace-level and project-level chat routes.
 */
export default function ChatThreadView({
  chat,
  messages,
  backHref,
  backLabel,
  runnable,
}: {
  chat: WorkspaceChat;
  messages: WorkspaceMessage[];
  backHref: string;
  backLabel: string;
  runnable: boolean;
}) {
  const provider = chat.provider ?? "ATELIER";

  return (
    <div>
      <Link href={backHref} className="action-quiet mb-10 inline-block">
        ← {backLabel}
      </Link>

      <p className="eyebrow mb-2">Chat · contexto ATELIER</p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-serif text-3xl md:text-4xl">{chat.title}</h1>
        <ChatSettings
          chatId={chat.id}
          provider={provider}
          model={chat.model}
          temperature={chat.temperature}
        />
      </div>

      <section className="mt-10">
        {messages.length === 0 ? (
          <p className="meta italic">
            Ainda não há mensagens. Escreve a primeira abaixo.
          </p>
        ) : (
          <ul className="space-y-5">
            {messages.map((m) => (
              <li key={m.id} className="border border-line bg-cream p-4">
                <div className="meta mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="uppercase tracking-editorial">{m.role}</span>
                  {m.provider ? <span>· {m.provider}</span> : null}
                  {m.model ? <span>· {m.model}</span> : null}
                  {m.tokens != null ? <span>· {m.tokens} tokens</span> : null}
                  {m.latencyMs != null ? <span>· {m.latencyMs} ms</span> : null}
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-charcoal/90">
                  {m.content}
                </p>
                {m.role === "assistant" ? (
                  <MessageActions content={m.content} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChatComposer chatId={chat.id} provider={provider} runnable={runnable} />
    </div>
  );
}
