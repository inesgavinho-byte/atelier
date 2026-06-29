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

/**
 * connectorId → Simple Icons slug. `null` ⇒ no brand mark, use branded initials.
 *
 * The Microsoft 365 marks (Outlook, Teams, SharePoint, OneDrive), LinkedIn and
 * Groq are intentionally null: Simple Icons removed those brands (and never had
 * Groq), so the CDN returns a non-image response that doesn't trigger `onError`
 * — it rendered as a broken image. Branded initials are used for them instead.
 */
const SLUGS: Record<string, string | null> = {
  openai: "openai",
  claude: "claude",
  perplexity: "perplexity",
  groq: null,
  deepseek: "deepseek",
  manus: null,
  gmail: "gmail",
  "outlook-email": null,
  teams: null,
  "ics-calendar": null,
  "google-calendar": "googlecalendar",
  "outlook-calendar": null,
  "google-drive": "googledrive",
  sharepoint: null,
  onedrive: null,
  github: "github",
  netlify: "netlify",
  supabase: "supabase",
  linkedin: null,
  instagram: "instagram",
};

/** Brand colour used to tint the initials fallback. */
const BRAND: Record<string, string> = {
  openai: "#412991",
  claude: "#D97757",
  perplexity: "#20808D",
  groq: "#F55036",
  deepseek: "#4D6BFE",
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

/**
 * Inline brand marks for connectors Simple Icons doesn't serve (Microsoft 365
 * apps, LinkedIn, Groq). Brand-coloured app-style tiles: a rounded square in
 * the brand colour with a white glyph (the official LinkedIn "in", a OneDrive
 * cloud, or the brand letter). Bundled locally, so they always render — no CDN.
 */
interface Tile {
  color: string;
  /** A short label, or "cloud"/"in" for the bespoke glyphs. */
  label: string;
}
const TILES: Record<string, Tile> = {
  "outlook-email": { color: "#0F6CBD", label: "O" },
  "outlook-calendar": { color: "#0F6CBD", label: "O" },
  teams: { color: "#4B53BC", label: "T" },
  sharepoint: { color: "#038387", label: "S" },
  onedrive: { color: "#0364B8", label: "cloud" },
  linkedin: { color: "#0A66C2", label: "in" },
  groq: { color: "#F55036", label: "G" },
};

function TileIcon({ tile, size }: { tile: Tile; size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="5" fill={tile.color} />
      {tile.label === "cloud" ? (
        <path
          d="M7.4 17.5a3.4 3.4 0 0 1-.5-6.76 4.7 4.7 0 0 1 8.86-1.2 3.6 3.6 0 0 1 .74 7.96H7.4z"
          fill="#fff"
        />
      ) : (
        <text
          x="12"
          y="12.5"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={tile.label.length > 1 ? 8.5 : 12}
          fontWeight="700"
          fill="#fff"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {tile.label}
        </text>
      )}
    </svg>
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

  // Bundled brand tile (Microsoft 365, LinkedIn, Groq) — takes precedence.
  const tile = TILES[connectorId];
  if (tile) {
    return (
      <span
        className="connector-icon connector-icon-tile"
        style={{ width: size, height: size }}
      >
        <TileIcon tile={tile} size={size} />
      </span>
    );
  }

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
        // The CDN sometimes answers an unknown slug with a non-erroring bad
        // body (no `error` event) → the image loads with zero intrinsic size.
        // Detect that and fall back to initials so a broken glyph never shows.
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth === 0) setFailed(true);
        }}
      />
    </span>
  );
}
