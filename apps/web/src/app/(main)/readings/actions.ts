"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";

/** Save a new reading (link for later). */
export async function createReading(input: {
  url: string;
  title?: string;
  note?: string;
  initiativeId?: string;
  tags: string[];
  status?: string;
  sourceType?: string;
}): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, message: "Supabase não configurado — nada guardado." };
  }
  const url = input.url.trim();
  if (!url) return { ok: false, message: "URL em falta." };

  const { error } = await sb.from("readings").insert({
    url,
    title: input.title?.trim() || null,
    note: input.note?.trim() || null,
    initiative_id: input.initiativeId || null,
    tags: input.tags ?? [],
    status: input.status || "Por ler",
    source_type: input.sourceType?.trim() || null,
  });
  if (error) return { ok: false, message: `Falha ao guardar: ${error.message}` };

  revalidatePath("/readings");
  revalidatePath("/");
  return { ok: true, message: "Leitura guardada." };
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
  revalidatePath("/");
  return { ok: !error };
}
