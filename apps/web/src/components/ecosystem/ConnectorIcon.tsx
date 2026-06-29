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
 * Official brand logos bundled locally for connectors Simple Icons doesn't
 * serve. Teams / OneDrive / LinkedIn come from the SVG Logos set
 * (@iconify-json/logos); Groq from @lobehub/icons-static-svg. Inlined as static
 * markup so they always render with zero runtime dependency or CDN call.
 */
interface Logo {
  viewBox: string;
  body: string;
  /** Fill for single-colour marks (Groq); multicolour logos carry their own. */
  fill?: string;
}
const LOGOS: Record<string, Logo> = {
  teams: {
    viewBox: "0 0 256 239",
    body: `<defs><linearGradient id="atTeamsG" x1="17.372%" x2="82.628%" y1="-6.51%" y2="106.51%"><stop offset="0%" stop-color="#5a62c3"/><stop offset="50%" stop-color="#4d55bd"/><stop offset="100%" stop-color="#3940ab"/></linearGradient><path id="atTeamsP" d="M136.93 64.476v12.8a32.7 32.7 0 0 1-5.953-.952a38.7 38.7 0 0 1-26.79-22.742h21.848c6.008.022 10.872 4.887 10.895 10.894"/></defs><path fill="#5059c9" d="M178.563 89.302h66.125c6.248 0 11.312 5.065 11.312 11.312v60.231c0 22.96-18.613 41.574-41.573 41.574h-.197c-22.96.003-41.576-18.607-41.579-41.568V95.215a5.91 5.91 0 0 1 5.912-5.913"/><circle cx="223.256" cy="50.605" r="26.791" fill="#5059c9"/><circle cx="139.907" cy="38.698" r="38.698" fill="#7b83eb"/><path fill="#7b83eb" d="M191.506 89.302H82.355c-6.173.153-11.056 5.276-10.913 11.449v68.697c-.862 37.044 28.445 67.785 65.488 68.692c37.043-.907 66.35-31.648 65.489-68.692v-68.697c.143-6.173-4.74-11.296-10.913-11.449"/><path d="M142.884 89.302v96.268a10.96 10.96 0 0 1-6.787 10.062c-1.3.55-2.697.833-4.108.833H76.68c-.774-1.965-1.488-3.93-2.084-5.953a72.5 72.5 0 0 1-3.155-21.076v-68.703c-.143-6.163 4.732-11.278 10.895-11.43z" opacity=".1"/><path d="M136.93 89.302v102.222c0 1.411-.283 2.808-.833 4.108a10.96 10.96 0 0 1-10.062 6.787H79.48c-1.012-1.965-1.965-3.93-2.798-5.954a59 59 0 0 1-2.084-5.953a72.5 72.5 0 0 1-3.155-21.076v-68.703c-.143-6.163 4.732-11.278 10.895-11.43z" opacity=".2"/><path d="M136.93 89.302v90.315c-.045 5.998-4.896 10.85-10.895 10.895H74.597a72.5 72.5 0 0 1-3.155-21.076v-68.703c-.143-6.163 4.732-11.278 10.895-11.43z" opacity=".2"/><path d="M130.977 89.302v90.315c-.046 5.998-4.897 10.85-10.895 10.895H74.597a72.5 72.5 0 0 1-3.155-21.076v-68.703c-.143-6.163 4.732-11.278 10.895-11.43z" opacity=".2"/><path fill="url(#atTeamsG)" d="M10.913 53.581h109.15c6.028 0 10.914 4.886 10.914 10.913v109.151c0 6.027-4.886 10.913-10.913 10.913H10.913C4.886 184.558 0 179.672 0 173.645V64.495C0 58.466 4.886 53.58 10.913 53.58"/><path fill="#fff" d="M94.208 95.125h-21.82v59.416H58.487V95.125H36.769V83.599h57.439z"/>`,
  },
  onedrive: {
    viewBox: "0 0 256 165",
    body: `<path fill="#0364b8" d="m154.66 110.682l52.842-50.534c-10.976-42.8-54.57-68.597-97.37-57.62a80 80 0 0 0-46.952 33.51c.817-.02 91.48 74.644 91.48 74.644"/><path fill="#0078d4" d="m97.618 45.552l-.002.009a63.7 63.7 0 0 0-33.619-9.543c-.274 0-.544.017-.818.02C27.852 36.476-.432 65.47.005 100.798a63.97 63.97 0 0 0 11.493 35.798l79.165-9.915l60.694-48.94z"/><path fill="#1490df" d="M207.502 60.148a53 53 0 0 0-3.51-.131a51.8 51.8 0 0 0-20.61 4.254l-.002-.005l-32.022 13.475l35.302 43.607l63.11 15.341c13.62-25.283 4.164-56.82-21.12-70.44a52 52 0 0 0-21.148-6.1"/><path fill="#28a8ea" d="M11.498 136.596a63.91 63.91 0 0 0 52.5 27.417h139.994a51.99 51.99 0 0 0 45.778-27.323l-98.413-58.95z"/>`,
  },
  linkedin: {
    viewBox: "0 0 256 256",
    body: `<path fill="#0a66c2" d="M218.123 218.127h-37.931v-59.403c0-14.165-.253-32.4-19.728-32.4c-19.756 0-22.779 15.434-22.779 31.369v60.43h-37.93V95.967h36.413v16.694h.51a39.91 39.91 0 0 1 35.928-19.733c38.445 0 45.533 25.288 45.533 58.186zM56.955 79.27c-12.157.002-22.014-9.852-22.016-22.009s9.851-22.014 22.008-22.016c12.157-.003 22.014 9.851 22.016 22.008A22.013 22.013 0 0 1 56.955 79.27m18.966 138.858H37.95V95.967h37.97zM237.033.018H18.89C8.58-.098.125 8.161-.001 18.471v219.053c.122 10.315 8.576 18.582 18.89 18.474h218.144c10.336.128 18.823-8.139 18.966-18.474V18.454c-.147-10.33-8.635-18.588-18.966-18.453"/>`,
  },
  groq: {
    viewBox: "0 0 24 24",
    fill: "#F55036",
    body: `<path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z"/>`,
  },
};

/** Brand-coloured tile fallback for the marks with no official open SVG
 * available offline (Outlook, SharePoint): rounded square + white letter. */
interface Tile {
  color: string;
  label: string;
}
const TILES: Record<string, Tile> = {
  "outlook-email": { color: "#0F6CBD", label: "O" },
  "outlook-calendar": { color: "#0F6CBD", label: "O" },
  sharepoint: { color: "#038387", label: "S" },
};

/**
 * Remote logo URLs for connectors with no bundled/official SVG (loaded by the
 * browser). Falls back to the brand tile via onError/onLoad if the host is
 * unreachable. Kept minimal — bundled logos are preferred.
 */
const REMOTE_ICONS: Record<string, string> = {
  sharepoint:
    "https://msicons.com/icons/sharepoint/microsoft-office-sharepoint-2025.svg",
};

function LogoIcon({ logo, size }: { logo: Logo; size: number }) {
  return (
    <svg
      viewBox={logo.viewBox}
      width={size}
      height={size}
      fill={logo.fill}
      role="img"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: logo.body }}
    />
  );
}

function TileIcon({ tile, size }: { tile: Tile; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill={tile.color} />
      <text
        x="12"
        y="12.5"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="#fff"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {tile.label}
      </text>
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

  // Official bundled logo (Teams, OneDrive, LinkedIn, Groq) — takes precedence.
  const logo = LOGOS[connectorId];
  if (logo) {
    return (
      <span
        className="connector-icon connector-icon-tile"
        style={{ width: size, height: size }}
      >
        <LogoIcon logo={logo} size={size} />
      </span>
    );
  }

  // Remote logo (browser-loaded), falling back to the tile on any failure.
  const remote = REMOTE_ICONS[connectorId];
  if (remote && !failed) {
    return (
      <span
        className="connector-icon connector-icon-tile"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="connector-icon-img"
          src={remote}
          alt={`${name} logótipo`}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth === 0) setFailed(true);
          }}
        />
      </span>
    );
  }

  // Brand-coloured tile fallback (Outlook, SharePoint — no official open SVG).
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
