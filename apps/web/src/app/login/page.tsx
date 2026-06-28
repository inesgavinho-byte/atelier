import type { Metadata } from "next";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar — ATELIER",
  robots: { index: false, follow: false },
};

/**
 * Access gate login. Rendered outside the (main) group, so it has no sidebar —
 * a single quiet card. The password is checked server-side in the login action;
 * nothing sensitive reaches the browser.
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string };
}) {
  const from = searchParams.from ?? "/";
  const failed = searchParams.error === "1";

  return (
    <main className="login-screen">
      <form action={login} className="login-card">
        <h1 className="login-title">ATELIER</h1>
        <p className="login-sub">Espaço privado. Introduz a palavra-passe.</p>

        <input type="hidden" name="from" value={from} />
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

        {failed ? (
          <p className="login-error">Palavra-passe incorrecta.</p>
        ) : null}

        <button type="submit" className="login-button">
          Entrar
        </button>
      </form>
    </main>
  );
}
