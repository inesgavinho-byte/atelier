import type { Metadata } from "next";
import { Suspense } from "react";
import { login } from "./actions";
import LoginParams from "./LoginParams";

export const metadata: Metadata = {
  title: "Entrar — ATELIER",
  robots: { index: false, follow: false },
};

/**
 * Access gate login. Rendered outside the (main) group, so it has no sidebar —
 * a single quiet card.
 *
 * The page is intentionally STATIC (no force-dynamic, no server-side
 * searchParams): Netlify serves it straight from the CDN, so it can never 404
 * because of SSR/Edge function routing. The dynamic pieces (destination and the
 * error notice) live in the LoginParams client island. The password is checked
 * server-side in the login action; nothing sensitive reaches the browser.
 */
export default function LoginPage() {
  return (
    <main className="login-screen">
      <form action={login} className="login-card">
        <h1 className="login-title">ATELIER</h1>
        <p className="login-sub">Espaço privado. Introduz a palavra-passe.</p>

        <input
          type="password"
          name="password"
          className="login-input"
          placeholder="Palavra-passe"
          autoComplete="current-password"
          aria-label="Palavra-passe"
          autoFocus
          required
        />

        <Suspense fallback={null}>
          <LoginParams />
        </Suspense>

        <button type="submit" className="login-button">
          Entrar
        </button>
      </form>
    </main>
  );
}
