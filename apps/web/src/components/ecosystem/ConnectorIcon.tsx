"use client";

import { useState } from "react";

/**
 * ATELIER — real connector logos.
 *
 * Renders each connector's official brand mark from the Simple Icons CDN
 * (https://cdn.simpleicons.org/<slug> → an SVG in the brand colour). The CDN is
 * public and needs no authentication; the request is made by the browser, not
 * the server. When a slug is missing or the image fails to load, we fall back to
 * the connector's initials tinted with the brand colour, so the icon is always
 * recognisable — never a broken-image glyph.
 *
 * Dark-mode legibility (some marks are near-black) is handled in CSS: in the
 * dark theme a translucent white circle is placed behind the icon
 * (`.connector-icon` under `[data-theme="dark"]`).
 */

/** connectorId → Simple Icons slug. `null` ⇒ no brand mark, use initials. */
const SLUGS: Record<string, string | null> = {
  openai: "openai",
  claude: "claude",
  perplexity: "perplexity",
  manus: null,
  gmail: "gmail",
  "outlook-email": "microsoftoutlook",
  teams: "microsoftteams",
  "ics-calendar": null,
  "google-calendar": "googlecalendar",
  "outlook-calendar": "microsoftoutlook",
  "google-drive": "googledrive",
  sharepoint: "microsoftsharepoint",
  onedrive: "microsoftonedrive",
  github: "github",
  netlify: "netlify",
  supabase: "supabase",
  linkedin: "linkedin",
  instagram: "instagram",
};

/** Brand colour used to tint the initials fallback. */
const BRAND: Record<string, string> = {
  openai: "#412991",
  claude: "#D97757",
  perplexity: "#20808D",
  manus: "#6E6A5E",
  gmail: "#EA4335",
  "outlook-email": "#0078D4",
  teams: "#6264A7",
  "ics-calendar": "#3F6F91",
  "google-calendar": "#4285F4",
  "outlook-calendar": "#0078D4",
  "google-drive": "#1FA463",
  sharepoint: "#0078D4",
  onedrive: "#0078D4",
  github: "#181717",
  netlify: "#00C7B7",
  supabase: "#3FCF8E",
  linkedin: "#0A66C2",
  instagram: "#E4405F",
};

function initials(name: string): string {
  return (
    name
      .replace(/[^A-Za-zÀ-ÿ ]/g, "")
      .trim()
      .slice(0, 2)
      .toUpperCase() || "·"
  );
}

export default function ConnectorIcon({
  connectorId,
  name,
  size = 32,
}: {
  connectorId: string;
  name: string;
  size?: number;
}) {
  const slug = SLUGS[connectorId] ?? null;
  const [failed, setFailed] = useState(false);
  const brand = BRAND[connectorId] ?? "currentColor";

  if (!slug || failed) {
    return (
      <span
        className="connector-icon connector-icon-fallback"
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.42),
          color: brand,
        }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <span className="connector-icon" style={{ width: size, height: size }}>
      {/* Brand SVG from the public Simple Icons CDN — an external, per-brand
          asset, so next/image optimisation does not apply. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="connector-icon-img"
        src={`https://cdn.simpleicons.org/${slug}`}
        alt={`${name} logótipo`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
