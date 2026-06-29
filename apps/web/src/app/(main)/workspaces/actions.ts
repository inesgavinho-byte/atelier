"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import {
  defaultModelForLabel,
  providerIdFromLabel,
  type AIMessage,
} from "@/lib/ai/types";
import { runtime } from "@/lib/ai-runtime/runtime";
import { skillIdForMode } from "@/lib/ai-runtime/types";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";
import {
  getChat,
  getMessages,
  getProject,
  getWorkspace,
} from "@/lib/workspaces";
import { isValidRepo } from "@/lib/github";

const now = () => new Date().toISOString();
const shortId = (prefix: string) =>
  `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
const firstLine = (text: string) =>
  text.trim().split("\n")[0].slice(0, 120) || "Sem título";

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

/** Slugify a name the same way the DB backfill does (accent-stripped). */
function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip combining diacritics
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}

/**
 * Edit a workspace's name and intent. The slug follows the name automatically
 * — but only while it hasn't been personalised (i.e. it still equals the old
 * name's slug); a slug the user set by hand is left untouched. Returns the
 * (possibly new) slug so the caller can navigate to the canonical URL.
 */
export async function updateWorkspace(
  id: string,
  input: { name: string; intent?: string }
): Promise<{ ok: boolean; slug?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Nome em falta." };

  const { data: current } = await sb
    .from("workspaces")
    .select("name, slug")
    .eq("id", id)
    .maybeSingle();

  const patch: Record<string, unknown> = { name, updated_at: now() };
  if (input.intent !== undefined) patch.intent = input.intent.trim() || null;

  let resultSlug = (current?.slug as string | null | undefined) ?? undefined;
  const slugWasAuto =
    !current?.slug || current.slug === slugify(current.name ?? "");
  if (slugWasAuto) {
    const base = slugify(name);
    // Avoid colliding with another workspace's slug (partial unique index).
    const { data: clash } = await sb
      .from("workspaces")
      .select("id")
      .eq("slug", base)
      .neq("id", id)
      .maybeSingle();
    const candidate = clash ? `${base}-${id.slice(0, 4)}` : base;
    patch.slug = candidate;
    resultSlug = candidate;
  }

  const { error } = await sb.from("workspaces").update(patch).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/workspaces");
  revalidatePath(`/workspaces/${id}`);
  if (resultSlug) revalidatePath(`/workspaces/${resultSlug}`);
  return { ok: true, slug: resultSlug, message: "Workspace actualizado." };
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
  githubRepo?: string;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Nome em falta." };

  const repo = input.githubRepo?.trim() || "";
  if (repo && !isValidRepo(repo)) {
    return { ok: false, message: 'Repositório inválido — usa "owner/repo".' };
  }

  // Append after the workspace's existing projects.
  const { data: last } = await sb
    .from("workspace_projects")
    .select("sort")
    .eq("workspace_id", input.workspaceId)
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort = (last?.sort ?? -1) + 1;

  const { data, error } = await sb
    .from("workspace_projects")
    .insert({
      workspace_id: input.workspaceId,
      name,
      description: input.description?.trim() || null,
      github_repo: repo || null,
      sort,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, id: data?.id, message: "Projeto criado." };
}

export async function updateProject(input: {
  id: string;
  workspaceId: string;
  name?: string;
  description?: string;
  githubRepo?: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const patch: Record<string, unknown> = { updated_at: now() };
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Nome em falta." };
    patch.name = name;
  }
  if (input.description !== undefined) {
    patch.description = input.description.trim() || null;
  }
  if (input.githubRepo !== undefined) {
    const repo = input.githubRepo.trim();
    if (repo && !isValidRepo(repo)) {
      return { ok: false, message: 'Repositório inválido — usa "owner/repo".' };
    }
    patch.github_repo = repo || null;
  }

  const { error } = await sb
    .from("workspace_projects")
    .update(patch)
    .eq("id", input.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/workspaces/${input.workspaceId}`);
  revalidatePath(`/workspaces/${input.workspaceId}/projects/${input.id}`);
  return { ok: true, message: "Projeto actualizado." };
}

export async function deleteProject(input: {
  id: string;
  workspaceId: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const { error } = await sb
    .from("workspace_projects")
    .delete()
    .eq("id", input.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/workspaces/${input.workspaceId}`);
  return { ok: true, message: "Projeto eliminado." };
}

/* ── Chats ────────────────────────────────────────────────────────────────── */

export async function createChat(input: {
  workspaceId: string;
  projectId?: string;
  title: string;
  provider?: string;
  mode?: string;
  model?: string;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const title = input.title.trim() || "Nova sessão";
  const provider = input.provider || "ATELIER";
  const mode = input.mode || "livre";
  const { data, error } = await sb
    .from("workspace_chats")
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId || null,
      title,
      provider,
      mode,
      skill_id: skillIdForMode(mode),
      model: input.model || defaultModelForLabel(provider) || null,
      temperature: 0.7,
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

/** Update a chat's provider/model/temperature. Preserves the conversation. */
export async function updateChatSettings(input: {
  chatId: string;
  provider?: string;
  model?: string;
  temperature?: number;
}): Promise<{ ok: boolean }> {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  const patch: Record<string, unknown> = { updated_at: now() };
  if (input.provider !== undefined) patch.provider = input.provider;
  if (input.model !== undefined) patch.model = input.model || null;
  if (input.temperature !== undefined) patch.temperature = input.temperature;
  const { error } = await sb
    .from("workspace_chats")
    .update(patch)
    .eq("id", input.chatId);
  revalidatePath(`/workspaces`);
  return { ok: !error };
}

/**
 * Save the user message and run the whole thread through the chat's provider
 * via the AI gateway, storing the assistant reply in the same thread. ATELIER
 * calls only the gateway — never a provider directly — so the storage is
 * independent of which engine executes the request.
 */
export async function runChatMessage(input: {
  chatId: string;
  content: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const content = input.content.trim();
  if (!content) return { ok: false, message: "Mensagem vazia." };

  const chat = await getChat(input.chatId);
  if (!chat) return { ok: false, message: "Chat não encontrado." };
  const providerId = providerIdFromLabel(chat.provider);
  if (!providerId) {
    return {
      ok: false,
      message: "Este chat não tem um provider executável. Guarda como nota.",
    };
  }

  // Persist the user message first so context survives a failed call.
  await sb.from("workspace_messages").insert({
    chat_id: chat.id,
    role: "user",
    content,
    provider: chat.provider,
    model: chat.model ?? null,
    skill_id: chat.skillId ?? null,
  });

  // Build the full thread (context belongs to ATELIER, not the provider).
  const thread = await getMessages(chat.id);
  const messages: AIMessage[] = thread
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Make stored connector credentials resolvable for this run.
  await hydrateCredentialOverrides();

  // Resolve workspace/project names for the session context.
  const [ws, project] = await Promise.all([
    getWorkspace(chat.workspaceId),
    chat.projectId ? getProject(chat.projectId) : Promise.resolve(undefined),
  ]);

  // ATELIER calls only the runtime — never a provider directly.
  const result = await runtime.run({
    provider: providerId,
    model: chat.model || undefined,
    temperature: chat.temperature,
    modeId: chat.mode,
    skillId: chat.skillId,
    workspaceName: ws?.name,
    projectName: project?.name,
    messages,
  });

  if (!result.ok) {
    await touchChat(chat.id);
    revalidatePath(`/workspaces`);
    return { ok: false, message: result.error ?? "Falha na execução." };
  }

  await sb.from("workspace_messages").insert({
    chat_id: chat.id,
    role: "assistant",
    content: result.text ?? "",
    provider: chat.provider,
    model: result.model,
    skill_id: result.skillId,
    tokens: result.tokens ?? null,
    latency_ms: result.latencyMs,
  });
  await touchChat(chat.id);
  revalidatePath(`/workspaces`);
  return { ok: true, message: `Resposta de ${chat.provider}.` };
}

/* ── Turn an AI response into ATELIER objects (no copy/paste) ─────────────── */

export async function saveMessageAsCapture(
  content: string
): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const { error } = await sb
    .from("captures")
    .insert({ kind: "texto", value: content });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "Guardado como captura." };
}

export async function createDecisionFromMessage(
  content: string
): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const { error } = await sb.from("decisions").insert({
    id: shortId("dec"),
    title: firstLine(content),
    kind: "direção",
    priority: "média",
    context: content,
    recommendation: firstLine(content),
    status: "pendente",
  });
  revalidatePath("/decisions");
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "Decisão criada." };
}

export async function createArtifactFromMessage(
  content: string
): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const { error } = await sb.from("artifacts").insert({
    id: shortId("art"),
    title: firstLine(content),
    kind: "nota",
    state: "rascunho",
    content,
    revision: 1,
    updated_at: now(),
  });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "Artefacto criado." };
}

export async function saveMessageAsReading(
  content: string
): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const { error } = await sb.from("readings").insert({
    url: null,
    title: firstLine(content),
    note: content,
    tags: ["A Rever"],
    status: "Por ler",
    source_type: "ai",
  });
  revalidatePath("/readings");
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: "Guardado em Leituras." };
}
