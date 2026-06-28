"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  checkPassword,
  issueSession,
} from "@/lib/auth";

/** Only follow internal, non-protocol-relative paths after login. */
function safeFrom(from: string): string {
  return from.startsWith("/") && !from.startsWith("//") ? from : "/";
}

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const from = safeFrom(String(formData.get("from") ?? "/"));

  if (!checkPassword(password)) {
    const qs = new URLSearchParams({ error: "1" });
    if (from !== "/") qs.set("from", from);
    redirect(`/login?${qs.toString()}`);
  }

  cookies().set(SESSION_COOKIE, await issueSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(from);
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
