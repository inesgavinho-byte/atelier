"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { recordTimelineEvent } from "@/lib/timeline";

const now = () => new Date().toISOString();
const firstLine = (text: string) =>
  (text.trim().split("\n")[0] || "Sessão").slice(0, 120);

/**
 * Sessions with intent (ADR-0005 F2). Start a session (a workspace_chats row
 * with an objective + skill), end it, or archive it — each lifecycle change is
 * recorded on the Timeline (session_start / session_end).
 */
export async function startSession(input: {
  workspaceId: string;
  objective: string;
  skill?: string;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const objective = input.objective.trim();
  if (!objective) return { ok: false, message: "Define o objectivo da sessão." };

  const { data, error } = await sb
    .from("workspace_chats")
    .insert({
      workspace_id: input.workspaceId,
      project_id: null,
      title: firstLine(objective),
      objective,
      skill_id: input.skill || null,
      session_state: "active",
      provider: "ATELIER",
      mode: "sessão",
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  await recordTimelineEvent({
    workspaceId: input.workspaceId,
    kind: "session_start",
    title: `Sessão iniciada — ${objective}`,
    body: input.skill || undefined,
    actor: "user",
  }).catch(() => {});

  revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, id: data.id as string, message: "Sessão iniciada." };
}

export async function endSession(input: {
  id: string;
  workspaceId: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const { data: session } = await sb
    .from("workspace_chats")
    .select("objective")
    .eq("id", input.id)
    .maybeSingle();

  const { error } = await sb
    .from("workspace_chats")
    .update({ session_state: "completed", ended_at: now() })
    .eq("id", input.id);
  if (error) return { ok: false, message: error.message };

  await recordTimelineEvent({
    workspaceId: input.workspaceId,
    kind: "session_end",
    title: `Sessão concluída — ${session?.objective ?? "sessão"}`,
    actor: "user",
  }).catch(() => {});

  revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, message: "Sessão concluída." };
}

export async function archiveSession(input: {
  id: string;
  workspaceId: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const { error } = await sb
    .from("workspace_chats")
    .update({ session_state: "archived" })
    .eq("id", input.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, message: "Sessão arquivada." };
}
