import { notFound } from "next/navigation";
import ChatThreadView from "@/components/workspaces/ChatThreadView";
import { getChat, getMessages, getWorkspace } from "@/lib/workspaces";
import { getConnectorView } from "@/lib/connector-status";

export const dynamic = "force-dynamic";

/** Workspace-level chat thread (a chat not attached to a project). */
export default async function WorkspaceChatThreadPage({
  params,
}: {
  params: { workspaceId: string; chatId: string };
}) {
  const [ws, chat] = await Promise.all([
    getWorkspace(params.workspaceId),
    getChat(params.chatId),
  ]);
  if (!ws || !chat) notFound();

  const messages = await getMessages(chat.id);
  const openaiConfigured = getConnectorView("openai")?.status === "Ligado";

  return (
    <ChatThreadView
      chat={chat}
      messages={messages}
      backHref={`/workspaces/${ws.id}`}
      backLabel={ws.name}
      openaiConfigured={Boolean(openaiConfigured)}
    />
  );
}
