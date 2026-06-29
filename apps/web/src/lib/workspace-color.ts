/**
 * Deterministic accent colour for a workspace, derived from its name.
 * Pure and client-safe — used for sidebar badges, the active-row tint and
 * launcher tiles. Colours are drawn from a small, restrained DECIMA palette
 * (muted purple / blue / green / rose / amber / coral) rather than a free hue,
 * so the sidebar stays editorial instead of rainbow.
 */
const PALETTE = [
  { solid: "#8f7ae5", tint: "rgba(143, 122, 229, 0.16)" }, // purple
  { solid: "#5f9fd6", tint: "rgba(95, 159, 214, 0.16)" }, // blue
  { solid: "#65b891", tint: "rgba(101, 184, 145, 0.16)" }, // green
  { solid: "#c86b91", tint: "rgba(200, 107, 145, 0.16)" }, // rose
  { solid: "#b99b4f", tint: "rgba(185, 155, 79, 0.16)" }, // amber
  { solid: "#d97862", tint: "rgba(217, 120, 98, 0.16)" }, // coral
] as const;

export function workspaceColor(name: string) {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  const { solid, tint } = PALETTE[Math.abs(hash) % PALETTE.length];
  // `bg`/`text` keep the previous shape (avatar background + glyph colour);
  // `tint` is the soft wash used behind the active workspace row.
  return { bg: solid, text: "#ffffff", solid, tint };
}
