"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import {
  domainOf,
  extractReading,
  type ReadingExtraction,
} from "@/lib/reading-extract";

/** Map an extraction result to the readings table's snake_case columns. */
function extractionColumns(x: ReadingExtraction) {
  return {
    content: x.content ?? null,
    excerpt: x.excerpt ?? null,
    thumbnail: x.thumbnail ?? null,
    read_time_minutes: x.readTimeMinutes ?? null,
    author: x.author ?? null,
    site_name: x.siteName ?? null,
  };
}

/**
 * Save a new reading. When a URL is given, the article is fetched and parsed
 * server-side (Readability) so the title, excerpt, thumbnail, reading time and
 * clean content are stored up front — the reader never has to fetch again.
 * Extraction never blocks the save from succeeding: if it fails we still store
 * the link with whatever metadata we have.
 */
export async function createReading(input: {
  url: string;
  title?: string;
  note?: string;
  workspaceId?: string;
  tags: string[];
  status?: string;
  sourceType?: string;
}): Promise<{ ok: boolean; message: string; id?: string }> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, message: "Supabase não configurado — nada guardado." };
  }
  const url = input.url.trim();
  if (!url) return { ok: false, message: "URL em falta." };

  const extracted = await extractReading(url);
  const cols = extractionColumns(extracted);

  const { data, error } = await sb
    .from("readings")
    .insert({
      url,
      title: input.title?.trim() || extracted.title || domainOf(url) || null,
      note: input.note?.trim() || null,
      workspace_id: input.workspaceId || null,
      tags: input.tags ?? [],
      status: input.status || "Por ler",
      source_type: input.sourceType?.trim() || null,
      ...cols,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: `Falha ao guardar: ${error.message}` };

  revalidatePath("/readings");
  revalidatePath("/");
  return {
    ok: true,
    message: extracted.content
      ? "Leitura guardada — conteúdo extraído."
      : "Leitura guardada.",
    id: data?.id,
  };
}

/**
 * Fetch a URL's metadata + reading time without saving — used to preview a link
 * before adding it from the quick-capture field.
 */
export async function previewReadingUrl(url: string): Promise<{
  ok: boolean;
  title?: string;
  excerpt?: string;
  thumbnail?: string;
  siteName?: string;
  author?: string;
  readTimeMinutes?: number;
  hasContent: boolean;
}> {
  const clean = url.trim();
  if (!clean) return { ok: false, hasContent: false };
  try {
    const x = await extractReading(clean);
    return {
      ok: true,
      title: x.title,
      excerpt: x.excerpt,
      thumbnail: x.thumbnail,
      siteName: x.siteName ?? domainOf(clean),
      author: x.author,
      readTimeMinutes: x.readTimeMinutes,
      hasContent: Boolean(x.content),
    };
  } catch {
    return { ok: false, siteName: domainOf(clean), hasContent: false };
  }
}

/**
 * (Re)extract and persist a reading's full content — used by the reader when a
 * row has no stored content yet (older rows, or a save-time extraction miss).
 */
export async function extractReadingContent(
  id: string
): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const { data: row } = await sb
    .from("readings")
    .select("url, title")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, message: "Leitura não encontrada." };
  if (!row.url) return { ok: false, message: "Esta leitura não tem URL." };

  const extracted = await extractReading(row.url);
  if (!extracted.content) {
    return { ok: false, message: "Não foi possível extrair o conteúdo." };
  }

  const cols = extractionColumns(extracted);
  const { error } = await sb
    .from("readings")
    .update({
      ...cols,
      title: row.title || extracted.title || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/readings/${id}`);
  revalidatePath("/readings");
  return { ok: true, message: "Conteúdo extraído." };
}

/** Update a reading's status. */
export async function setReadingStatus(
  id: string,
  status: string
): Promise<{ ok: boolean }> {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  const { error } = await sb
    .from("readings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/readings");
  revalidatePath(`/readings/${id}`);
  revalidatePath("/");
  return { ok: !error };
}

/** Update a reading's note. */
export async function setReadingNote(
  id: string,
  note: string
): Promise<{ ok: boolean }> {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  const { error } = await sb
    .from("readings")
    .update({ note: note.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/readings/${id}`);
  revalidatePath("/readings");
  return { ok: !error };
}

/** Associate (or clear) a reading's workspace. */
export async function setReadingWorkspace(
  id: string,
  workspaceId: string | null
): Promise<{ ok: boolean }> {
  const sb = getSupabase();
  if (!sb) return { ok: false };
  const { error } = await sb
    .from("readings")
    .update({
      workspace_id: workspaceId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath(`/readings/${id}`);
  revalidatePath("/readings");
  return { ok: !error };
}
