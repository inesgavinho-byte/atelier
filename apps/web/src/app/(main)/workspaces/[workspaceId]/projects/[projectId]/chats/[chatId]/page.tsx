import { notFound } from "next/navigation";
import ChatThreadView from "@/components/workspaces/ChatThreadView";
import { getChat, getMessages, getProject, getWorkspace } from "@/lib/workspaces";
import { gateway } from "@/lib/ai/gateway";
import { providerIdFromLabel } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export default async function ProjectChatThreadPage({
  params,
}: {
  params: { workspaceId: string; projectId: string; chatId: string };
}) {
  const [ws, project, chat] = await Promise.all([
    getWorkspace(params.workspaceId),
    getProject(params.projectId),
    getChat(params.chatId),
  ]);
  if (!ws || !project || !chat) notFound();

  const messages = await getMessages(chat.id);
  const providerId = providerIdFromLabel(chat.provider);
  const runnable = Boolean(providerId && gateway.get(providerId)?.available());

  return (
    <ChatThreadView
      chat={chat}
      messages={messages}
      backHref={`/workspaces/${ws.id}/projects/${project.id}`}
      backLabel={project.name}
      runnable={runnable}
    />
  );
}
