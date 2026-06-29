import "server-only";
import { cache } from "react";
import { getSupabase } from "@/lib/supabase";
import { initialsFrom } from "@/lib/profile-colors";

export interface ChatIdentity {
  name: string;
  initials: string;
  avatarUrl: string | null;
  colour: string;
}

/**
 * User profile data layer. The app is currently single-operator (a password
 * gate, not multi-user auth), so the profile is a singleton keyed by
 * PRIMARY_USER_ID. The model is multi-user ready: every row carries user_id and
 * the workspace identities table is keyed by (user_id, workspace_id).
 */

export const PRIMARY_USER_ID = "primary";

export interface UserProfile {
  userId: string;
  displayName: string;
  firstName: string;
  lastName: string;
  roleTitle: string;
  avatarUrl: string | null;
  initials: string;
  personalColour: string;
  preferredLanguage: string;
  timezone: string;
  shortBio: string;
  status: string;
  answerStyle: string;
  answerTone: string;
  defaultDecimusMode: string;
  interfaceDensity: string;
  theme: string;
}

export interface WorkspaceIdentity {
  workspaceId: string;
  displayName: string | null;
  roleTitle: string | null;
  avatarUrl: string | null;
  personalColour: string | null;
}

/** The profile shown when Supabase is unconfigured or the row is missing. */
const FALLBACK: UserProfile = {
  userId: PRIMARY_USER_ID,
  displayName: "Inês Gavinho",
  firstName: "Inês",
  lastName: "Gavinho",
  roleTitle: "Founder / Product Owner",
  avatarUrl: null,
  initials: "IG",
  personalColour: "sand",
  preferredLanguage: "pt-PT",
  timezone: "Europe/Lisbon",
  shortBio: "",
  status: "available",
  answerStyle: "balanced",
  answerTone: "editorial",
  defaultDecimusMode: "complex",
  interfaceDensity: "comfortable",
  theme: "system",
};

type Row = Record<string, string | null | undefined>;

function mapProfile(r: Row): UserProfile {
  const displayName = r.display_name ?? FALLBACK.displayName;
  return {
    userId: r.user_id ?? PRIMARY_USER_ID,
    displayName,
    firstName: r.first_name ?? "",
    lastName: r.last_name ?? "",
    roleTitle: r.role_title ?? "",
    avatarUrl: r.avatar_url ?? null,
    initials: r.initials || initialsFrom(displayName),
    personalColour: r.personal_colour ?? "sand",
    preferredLanguage: r.preferred_language ?? "pt-PT",
    timezone: r.timezone ?? "Europe/Lisbon",
    shortBio: r.short_bio ?? "",
    status: r.status ?? "available",
    answerStyle: r.answer_style ?? "balanced",
    answerTone: r.answer_tone ?? "editorial",
    defaultDecimusMode: r.default_decimus_mode ?? "complex",
    interfaceDensity: r.interface_density ?? "comfortable",
    theme: r.theme ?? "system",
  };
}

function mapWorkspaceIdentity(r: Row): WorkspaceIdentity {
  return {
    workspaceId: r.workspace_id ?? "",
    displayName: r.display_name ?? null,
    roleTitle: r.role_title ?? null,
    avatarUrl: r.avatar_url ?? null,
    personalColour: r.personal_colour ?? null,
  };
}

/** The current operator's profile (singleton). Degrades to a sensible default. */
export const getProfile = cache(getProfileUncached);
async function getProfileUncached(): Promise<UserProfile> {
  const sb = getSupabase();
  if (!sb) return FALLBACK;
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("user_id", PRIMARY_USER_ID)
    .maybeSingle();
  return data ? mapProfile(data) : FALLBACK;
}

/** All per-workspace identity overrides for the current operator. */
export async function getWorkspaceIdentities(): Promise<WorkspaceIdentity[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("user_workspace_profiles")
    .select("*")
    .eq("user_id", PRIMARY_USER_ID);
  return (data ?? []).map(mapWorkspaceIdentity);
}

/**
 * The operator's chat identity for a given workspace: the base profile with any
 * per-workspace override (name / colour / avatar) applied on top.
 */
export async function getChatIdentity(
  workspaceId: string
): Promise<ChatIdentity> {
  const profile = await getProfile();
  let override: WorkspaceIdentity | undefined;
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("user_workspace_profiles")
      .select("*")
      .eq("user_id", PRIMARY_USER_ID)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (data) override = mapWorkspaceIdentity(data);
  }
  const name = override?.displayName || profile.displayName;
  return {
    name,
    initials: initialsFrom(name),
    avatarUrl: override?.avatarUrl ?? profile.avatarUrl,
    colour: override?.personalColour || profile.personalColour,
  };
}
