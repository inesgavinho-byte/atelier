import { notFound } from "next/navigation";
import ChatThreadView from "@/components/workspaces/ChatThreadView";
import { getChat, getMessages, getProject, getWorkspace } from "@/lib/workspaces";
import { getConnectorView } from "@/lib/connector-status";

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
  const openaiConfigured = getConnectorView("openai")?.status === "Ligado";

  return (
    <ChatThreadView
      chat={chat}
      messages={messages}
      backHref={`/workspaces/${ws.id}/projects/${project.id}`}
      backLabel={project.name}
      openaiConfigured={Boolean(openaiConfigured)}
    />
  );
}
