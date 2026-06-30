/**
 * Client-safe Personal Decimin v2 types + labels. Kept out of lib/decimin.ts
 * (server-only) so client components can import them.
 */

export type CapabilityMode = "active" | "shadow" | "off";

export interface DeciminCapability {
  capability: string;
  mode: CapabilityMode;
  lastShadowOutput: string | null;
  lastShadowAt: string | null;
}

/** Friendly labels for the known capabilities. */
export const CAPABILITY_LABELS: Record<string, string> = {
  daily_briefing: "Briefing diário",
  watch_notifications: "Notificações (decisões + Minions)",
};
