"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { PRIMARY_USER_ID } from "@/lib/profile";
import { initialsFrom } from "@/lib/profile-colors";

type Result = { ok: boolean; message: string; avatarUrl?: string | null };

const now = () => new Date().toISOString();

/** Fields the Profile/Appearance/DECIMA forms may write, mapped to columns. */
const FIELD_MAP: Record<string, string> = {
  displayName: "display_name",
  firstName: "first_name",
  lastName: "last_name",
  roleTitle: "role_title",
  personalColour: "personal_colour",
  preferredLanguage: "preferred_language",
  timezone: "timezone",
  shortBio: "short_bio",
  status: "status",
  answerStyle: "answer_style",
  answerTone: "answer_tone",
  defaultDecimusMode: "default_decimus_mode",
  interfaceDensity: "interface_density",
  theme: "theme",
};

/** Update the operator's profile (partial). Recomputes initials from the name. */
export async function updateProfile(
  patch: Record<string, string>
): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const row: Record<string, unknown> = { updated_at: now() };
  for (const [key, col] of Object.entries(FIELD_MAP)) {
    if (key in patch) row[col] = patch[key];
  }
  if (typeof patch.displayName === "string") {
    row.initials = initialsFrom(patch.displayName);
  }

  const { error } = await sb
    .from("profiles")
    .update(row)
    .eq("user_id", PRIMARY_USER_ID);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil actualizado." };
}

const ACCEPTED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Upload a profile photo (base64) to the avatars bucket and store its URL. */
export async function uploadAvatar(input: {
  base64: string;
  mime: string;
}): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const ext = ACCEPTED.get(input.mime);
  if (!ext) {
    return { ok: false, message: "Formato não suportado — usa JPG, PNG ou WebP." };
  }
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.byteLength > MAX_AVATAR_BYTES) {
    return { ok: false, message: "Imagem demasiado grande (máx. 2 MB)." };
  }

  const path = `${PRIMARY_USER_ID}/avatar.${ext}`;
  const up = await sb.storage
    .from("avatars")
    .upload(path, bytes, { contentType: input.mime, upsert: true });
  if (up.error) return { ok: false, message: up.error.message };

  // Cache-bust so the new image shows immediately behind the public URL.
  const base = sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const url = `${base}?v=${Date.now()}`;

  const { error } = await sb
    .from("profiles")
    .update({ avatar_url: url, updated_at: now() })
    .eq("user_id", PRIMARY_USER_ID);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");
  return { ok: true, message: "Fotografia actualizada.", avatarUrl: url };
}

/** Remove the profile photo (keeps the initials fallback). */
export async function removeAvatar(): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };
  const { error } = await sb
    .from("profiles")
    .update({ avatar_url: null, updated_at: now() })
    .eq("user_id", PRIMARY_USER_ID);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");
  return { ok: true, message: "Fotografia removida.", avatarUrl: null };
}

/** Create/update how the operator appears inside one workspace. */
export async function saveWorkspaceIdentity(input: {
  workspaceId: string;
  displayName?: string;
  roleTitle?: string;
  personalColour?: string;
}): Promise<Result> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: "Supabase não configurado." };

  const { error } = await sb.from("user_workspace_profiles").upsert(
    {
      user_id: PRIMARY_USER_ID,
      workspace_id: input.workspaceId,
      display_name: input.displayName?.trim() || null,
      role_title: input.roleTitle?.trim() || null,
      personal_colour: input.personalColour || null,
      updated_at: now(),
    },
    { onConflict: "user_id,workspace_id" }
  );
  if (error) return { ok: false, message: error.message };

  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");
  return { ok: true, message: "Identidade do workspace guardada." };
}
