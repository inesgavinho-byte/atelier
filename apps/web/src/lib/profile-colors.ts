/**
 * The DECIMA personal-colour palette — muted, premium tokens used for avatar
 * fallbacks and the soft per-user chat tint. Pure and client-safe (no server
 * imports) so both the settings form and the Avatar component can use it.
 */
export interface PersonalColour {
  key: string;
  label: string;
  /** Solid fill for the initials avatar. */
  solid: string;
  /** Very soft wash for the message bubble. */
  tint: string;
  /** Glyph/initials colour on the solid fill. */
  text: string;
}

export const PERSONAL_COLOURS: PersonalColour[] = [
  { key: "sand", label: "Sand", solid: "#b9a36e", tint: "rgba(185, 163, 110, 0.14)", text: "#fff" },
  { key: "sage", label: "Sage", solid: "#8aa888", tint: "rgba(138, 168, 136, 0.14)", text: "#fff" },
  { key: "dusty-blue", label: "Dusty Blue", solid: "#7d9bb5", tint: "rgba(125, 155, 181, 0.14)", text: "#fff" },
  { key: "mauve", label: "Mauve", solid: "#a98aa9", tint: "rgba(169, 138, 169, 0.14)", text: "#fff" },
  { key: "clay", label: "Clay", solid: "#c08566", tint: "rgba(192, 133, 102, 0.14)", text: "#fff" },
  { key: "olive", label: "Olive", solid: "#8f9468", tint: "rgba(143, 148, 104, 0.14)", text: "#fff" },
  { key: "pearl", label: "Pearl", solid: "#d8d2c4", tint: "rgba(216, 210, 196, 0.18)", text: "#2b2a26" },
  { key: "graphite", label: "Graphite", solid: "#6f6f6c", tint: "rgba(111, 111, 108, 0.16)", text: "#fff" },
];

const DEFAULT_COLOUR = PERSONAL_COLOURS[0];

/** Resolve a colour key to its token (falls back to Sand). */
export function personalColour(key?: string | null): PersonalColour {
  if (!key) return DEFAULT_COLOUR;
  return PERSONAL_COLOURS.find((c) => c.key === key) ?? DEFAULT_COLOUR;
}

/** Up to two initials from a name ("Inês Gavinho" → "IG"). */
export function initialsFrom(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const STATUS_OPTIONS = [
  { key: "available", label: "Disponível", dot: "#65b891" },
  { key: "busy", label: "Ocupada", dot: "#c08566" },
  { key: "away", label: "Ausente", dot: "#8d887c" },
] as const;
