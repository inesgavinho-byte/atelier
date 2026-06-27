import Link from "next/link";
import ChatComposer from "@/components/workspaces/ChatComposer";
import type { WorkspaceChat, WorkspaceMessage } from "@/lib/workspaces";

/**
 * Presentational chat thread: a back link, the message thread and the
 * composer. Shared by the workspace-level and project-level chat routes so the
 * thread renders identically in both contexts.
 */
export default function ChatThreadView({
  chat,
  messages,
  backHref,
  backLabel,
  openaiConfigured,
}: {
  chat: WorkspaceChat;
  messages: WorkspaceMessage[];
  backHref: string;
  backLabel: string;
  openaiConfigured: boolean;
}) {
  return (
    <div>
      <Link href={backHref} className="action-quiet mb-10 inline-block">
        ← {backLabel}
      </Link>

      <p className="eyebrow mb-2">
        Chat · {chat.provider ?? "ATELIER"} · contexto ATELIER
      </p>
      <h1 className="font-serif text-3xl md:text-4xl">{chat.title}</h1>

      <section className="mt-10">
        {messages.length === 0 ? (
          <p className="meta italic">
            Ainda não há mensagens. Escreve a primeira abaixo.
          </p>
        ) : (
          <ul className="space-y-5">
            {messages.map((m) => (
              <li key={m.id} className="border border-line bg-cream p-4">
                <div className="meta mb-2 flex items-center gap-2">
                  <span className="uppercase tracking-editorial">{m.role}</span>
                  {m.provider ? <span>· {m.provider}</span> : null}
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-charcoal/90">
                  {m.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChatComposer
        chatId={chat.id}
        defaultProvider={chat.provider ?? "ATELIER"}
        openaiConfigured={openaiConfigured}
      />
    </div>
  );
}
