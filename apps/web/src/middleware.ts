import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, gateEnabled, verifySession } from "@/lib/auth";

/**
 * Optional access gate.
 *
 * When ATELIER_ACCESS_PASSWORD is unset the gate is fully disabled and every
 * request passes straight through — the app is unchanged. When it is set, any
 * request without a valid session cookie is redirected to /login (preserving
 * where it was heading). The /login route itself is always allowed so the form
 * and its server action can run.
 */
export async function middleware(req: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and a few static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
