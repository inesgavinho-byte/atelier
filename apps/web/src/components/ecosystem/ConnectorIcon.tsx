/**
 * ConnectorIcon — a small (32–36px) rounded brand tile for a connector.
 *
 * Renders an inline SVG glyph for the handful of connectors whose category is
 * visually obvious (mail, calendar, cloud); otherwise it renders the
 * connector's initial(s) on a brand-coloured tile. Brand colours are the only
 * hardcoded colours in the page — they are intentional brand identity. Any
 * unlisted id falls back to the theme accent tokens so it stays theme-aware.
 */

type Brand = { bg: string; fg: string };

/** Brand background tint + readable foreground per connector id. */
const BRAND: Record<string, Brand> = {
  openai: { bg: "#000000", fg: "#ffffff" },
  claude: { bg: "#d97757", fg: "#ffffff" },
  perplexity: { bg: "#1f1f1f", fg: "#ffffff" },
  manus: { bg: "#3a3a3a", fg: "#ffffff" },
  gmail: { bg: "#ea4335", fg: "#ffffff" },
  "outlook-email": { bg: "#0078d4", fg: "#ffffff" },
  teams: { bg: "#6264a7", fg: "#ffffff" },
  "google-drive": { bg: "#1fa463", fg: "#ffffff" },
  sharepoint: { bg: "#038387", fg: "#ffffff" },
  onedrive: { bg: "#0078d4", fg: "#ffffff" },
  github: { bg: "#181717", fg: "#ffffff" },
  netlify: { bg: "#00ad9f", fg: "#ffffff" },
  supabase: { bg: "#3ecf8e", fg: "#0a1f15" },
  linkedin: { bg: "#0a66c2", fg: "#ffffff" },
  instagram: { bg: "#e1306c", fg: "#ffffff" },
  "google-calendar": { bg: "#4285f4", fg: "#ffffff" },
  "outlook-calendar": { bg: "#0078d4", fg: "#ffffff" },
};

/** Connectors that get an inline glyph instead of initials. */
type Glyph = "envelope" | "calendar" | "cloud";

const GLYPHS: Record<string, Glyph> = {
  gmail: "envelope",
  "outlook-email": "envelope",
  "ics-calendar": "calendar",
  "google-calendar": "calendar",
  "outlook-calendar": "calendar",
  onedrive: "cloud",
};

function monogram(name: string): string {
  return (
    name
      .replace(/[^A-Za-zÀ-ÿ ]/g, "")
      .trim()
      .slice(0, 2)
      .toUpperCase() || "·"
  );
}

function GlyphSvg({ kind, color }: { kind: Glyph; color: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "envelope") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }
  if (kind === "calendar") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M6.5 18a4 4 0 0 1-.3-7.99 5.5 5.5 0 0 1 10.6 1.2A3.4 3.4 0 0 1 17.5 18Z" />
    </svg>
  );
}

export default function ConnectorIcon({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const brand = BRAND[id];
  const glyph = GLYPHS[id];

  // Theme-aware fallback for unlisted ids: accent-soft tile, accent text.
  const style: React.CSSProperties = brand
    ? { background: brand.bg, color: brand.fg, borderColor: "transparent" }
    : id === "ics-calendar"
      ? {
          background: "var(--accent-soft)",
          color: "var(--accent)",
          borderColor: "var(--border)",
        }
      : {
          background: "var(--accent-soft)",
          color: "var(--accent)",
          borderColor: "var(--border)",
        };

  return (
    <span className="connector-icon" style={style} aria-hidden="true">
      {glyph ? (
        <GlyphSvg kind={glyph} color={style.color as string} />
      ) : (
        <span className="connector-icon-mono">{monogram(name)}</span>
      )}
    </span>
  );
}
