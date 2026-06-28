import "server-only";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, gateEnabled, verifySession } from "@/lib/auth";

/**
 * Whether a request is allowed through the API.
 *
 * Mirrors the middleware gate (Fase 3): when no access password is configured
 * the app is open and requests pass; when it is, an API request must carry a
 * valid session cookie — same token the login flow issues.
 */
export async function requestAuthed(req: NextRequest): Promise<boolean> {
  if (!gateEnabled()) return true;
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value);
}
