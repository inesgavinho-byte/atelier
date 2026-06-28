/**
 * Edge-safe session helpers for the optional access gate.
 *
 * The gate is a single shared password (ATELIER_ACCESS_PASSWORD). On a correct
 * password we issue a signed, time-limited cookie; the middleware verifies the
 * signature on every request without any database lookup. Everything here uses
 * Web Crypto (crypto.subtle), so it runs unchanged in the Edge middleware and
 * in Node server actions.
 *
 * Intentionally does NOT import "server-only": the middleware (Edge runtime)
 * needs these helpers. There are no secrets in the output — only signatures.
 */

export const SESSION_COOKIE = "atelier_session";

/** Days a session stays valid before re-login is required. */
const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60; // seconds

/**
 * The gate is OFF unless a password is configured. This makes the feature
 * fully reversible: with no env var, the app behaves exactly as before and
 * there is no risk of locking anyone out.
 */
export function gateEnabled(): boolean {
  return Boolean(process.env.ATELIER_ACCESS_PASSWORD);
}

/** Signing key: a dedicated secret if present, else the password itself. */
function signingSecret(): string {
  return (
    process.env.ATELIER_SESSION_SECRET ||
    process.env.ATELIER_ACCESS_PASSWORD ||
    ""
  );
}

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64url(sig);
}

/** Constant-time string comparison (avoids leaking length-prefix matches). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Check a submitted password against the configured one, in constant time. */
export function checkPassword(input: string): boolean {
  const expected = process.env.ATELIER_ACCESS_PASSWORD || "";
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}

/** Issue a signed token whose payload is the issued-at time (seconds). */
export async function issueSession(): Promise<string> {
  const issued = Math.floor(Date.now() / 1000).toString(36);
  const sig = await hmac(issued);
  return `${issued}.${sig}`;
}

/** Verify a token's signature and that it is within the max age. */
export async function verifySession(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const issued = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(issued);
  if (!timingSafeEqual(sig, expected)) return false;
  const issuedAt = parseInt(issued, 36);
  if (!Number.isFinite(issuedAt)) return false;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  return age >= 0 && age <= SESSION_MAX_AGE;
}
