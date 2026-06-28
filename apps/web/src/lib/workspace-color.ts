/**
 * Deterministic accent colour for a workspace, derived from its name.
 * Pure and client-safe — used for sidebar avatars and launcher tiles.
 */
export function workspaceColor(name: string) {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return { bg: `hsla(${hue},60%,60%,0.2)`, text: `hsla(${hue},80%,75%,0.9)` };
}
