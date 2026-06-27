import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Symmetric encryption for credential values at rest (server-only).
 *
 * AES-256-GCM with a key derived from ATELIER_CRED_KEY. When that env var is
 * absent, encryption is unavailable and callers must store values in clear
 * (flagged insecure) per the sprint's dev-mode allowance.
 */

const SALT = "atelier-connector-credentials";

function key(): Buffer | null {
  const secret = process.env.ATELIER_CRED_KEY;
  if (!secret) return null;
  return scryptSync(secret, SALT, 32);
}

export function encryptionAvailable(): boolean {
  return Boolean(process.env.ATELIER_CRED_KEY);
}

/** Encrypt a value. Format: iv.authTag.ciphertext (all base64). */
export function encrypt(plain: string): string | null {
  const k = key();
  if (!k) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString(
    "base64"
  )}`;
}

/** Decrypt a value produced by encrypt(). Returns null on any failure. */
export function decrypt(payload: string): string | null {
  const k = key();
  if (!k) return null;
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      k,
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
