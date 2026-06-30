import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { CapabilityMode, DeciminCapability } from "@/lib/decimin-constants";

/**
 * Personal Decimin v2 — Shadow Mode capabilities. Each capability runs in
 * 'active' (acts), 'shadow' (computes silently, records what it would have
 * sent) or 'off'. RLS-locked to the service role; read via the admin client.
 * Client-safe types/labels live in lib/decimin-constants.
 */

export type { CapabilityMode, DeciminCapability } from "@/lib/decimin-constants";
export { CAPABILITY_LABELS } from "@/lib/decimin-constants";

export async function getCapabilities(): Promise<DeciminCapability[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("decimin_capabilities")
    .select("capability, mode, last_shadow_output, last_shadow_at")
    .order("capability");
  return (data ?? []).map((r: any) => ({
    capability: r.capability,
    mode: (r.mode as CapabilityMode) ?? "shadow",
    lastShadowOutput: r.last_shadow_output ?? null,
    lastShadowAt: r.last_shadow_at ?? null,
  }));
}
