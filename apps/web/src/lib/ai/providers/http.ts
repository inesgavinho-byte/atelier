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

/** Read the first env var present from a list of names. */
export function readEnv(...names: string[]): string | undefined {
  for (const n of names) if (process.env[n]) return process.env[n];
  return undefined;
}
