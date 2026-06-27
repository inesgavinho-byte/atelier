"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { runOpenAICompletion } from "@/lib/connector-status";

const now = () => new Date().toISOString();

/* ── Workspaces ───────────────────────────────────────────────────────────── */

export async function createWorkspace(input: {
  name: string;
  description?: string;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Nome em falta." };
  const { data, error } = await sb
    .from("workspaces")
    .insert({ name, description: input.description?.trim() || null })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath("/workspaces");
  return { ok: true, id: data?.id, message: "Workspace criado." };
}

export async function renameWorkspace(
  id: string,
  name: string
): Promise<{ ok: boolean }> {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false };
  const { error } = await sb
    .from("workspaces")
    .update({ name: trimmed, updated_at: now() })
    .eq("id", id);
  revalidatePath("/workspaces");
  revalidatePath(`/workspaces/${id}`);
  return { ok: !error };
}

export async function archiveWorkspace(id: string): Promise<{ ok: boolean }> {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  const { error } = await sb
    .from("workspaces")
    .update({ status: "Arquivado", updated_at: now() })
    .eq("id", id);
  revalidatePath("/workspaces");
  revalidatePath(`/workspaces/${id}`);
  return { ok: !error };
}

/* ── Projects ─────────────────────────────────────────────────────────────── */

export async function createProject(input: {
  workspaceId: string;
  name: string;
  description?: string;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Nome em falta." };
  const { data, error } = await sb
    .from("workspace_projects")
    .insert({
      workspace_id: input.workspaceId,
      name,
      description: input.description?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, id: data?.id, message: "Projeto criado." };
}

/* ── Chats ────────────────────────────────────────────────────────────────── */

export async function createChat(input: {
  workspaceId: string;
  projectId?: string;
  title: string;
  provider?: string;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const title = input.title.trim() || "Novo chat";
  const { data, error } = await sb
    .from("workspace_chats")
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId || null,
      title,
      provider: input.provider || "ATELIER",
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/workspaces/${input.workspaceId}`);
  if (input.projectId)
    revalidatePath(`/workspaces/${input.workspaceId}/projects/${input.projectId}`);
  return { ok: true, id: data?.id, message: "Chat criado." };
}

/* ── Messages ─────────────────────────────────────────────────────────────── */

async function touchChat(chatId: string) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("workspace_chats").update({ updated_at: now() }).eq("id", chatId);
}

/** Save a manual message to a chat thread. */
export async function sendMessage(input: {
  chatId: string;
  content: string;
  role?: string;
  provider?: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const content = input.content.trim();
  if (!content) return { ok: false, message: "Mensagem vazia." };
  const { error } = await sb.from("workspace_messages").insert({
    chat_id: input.chatId,
    role: input.role || "user",
    content,
    provider: input.provider || null,
  });
  if (error) return { ok: false, message: error.message };
  await touchChat(input.chatId);
  revalidatePath(`/workspaces`);
  return { ok: true, message: "Mensagem guardada." };
}

/**
 * Save the message and run it through OpenAI, storing the assistant reply in
 * the same thread. Only used when the OpenAI connector is configured.
 */
export async function runMessageWithOpenAI(input: {
  chatId: string;
  content: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const content = input.content.trim();
  if (!content) return { ok: false, message: "Mensagem vazia." };

  // Save the user message first, so context is preserved even if the call fails.
  await sb.from("workspace_messages").insert({
    chat_id: input.chatId,
    role: "user",
    content,
    provider: "OpenAI",
  });

  const result = await runOpenAICompletion(content);
  if (!result.ok) {
    await touchChat(input.chatId);
    revalidatePath(`/workspaces`);
    return { ok: false, message: result.error ?? "Falha na chamada OpenAI." };
  }

  await sb.from("workspace_messages").insert({
    chat_id: input.chatId,
    role: "assistant",
    content: result.text ?? "",
    provider: "OpenAI",
  });
  await touchChat(input.chatId);
  revalidatePath(`/workspaces`);
  return { ok: true, message: "Resposta recebida." };
}
