import { notFound } from "next/navigation";
import ChatThreadView from "@/components/workspaces/ChatThreadView";
import { getChat, getMessages, getWorkspace } from "@/lib/workspaces";
import { gateway } from "@/lib/ai/gateway";
import { providerIdFromLabel } from "@/lib/ai/types";

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
  const providerId = providerIdFromLabel(chat.provider);
  const runnable = Boolean(providerId && gateway.get(providerId)?.available());

  return (
    <ChatThreadView
      chat={chat}
      messages={messages}
      backHref={`/workspaces/${ws.id}`}
      backLabel={ws.name}
      runnable={runnable}
    />
  );
}
