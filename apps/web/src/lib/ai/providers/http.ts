import "server-only";

/**
 * Shared HTTP helpers for AI providers (server-only). One place for the fetch
 * timeout and error-normalisation boilerplate so providers don't duplicate it.
 */

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function errMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "AbortError") return "Tempo limite excedido.";
    return e.message;
  }
  return String(e);
}

/**
 * Server-side credential overrides, populated from the secret store at runtime.
 * Lets stored credentials resolve exactly like environment variables without
 * the value ever reaching the browser. Process env always wins.
 */
const overrides = new Map<string, string>();

export function setCredentialOverride(name: string, value: string): void {
  overrides.set(name, value);
}

export function clearCredentialOverride(name: string): void {
  overrides.delete(name);
}

/** Read the first credential present (env first, then stored override). */
export function readEnv(...names: string[]): string | undefined {
  for (const n of names) if (process.env[n]) return process.env[n];
  for (const n of names) {
    const v = overrides.get(n);
    if (v) return v;
  }
  return undefined;
}
