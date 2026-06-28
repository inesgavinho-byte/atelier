"use client";

import { useSearchParams } from "next/navigation";

/**
 * The only dynamic bits of the login form: the post-login destination and the
 * "wrong password" notice, both read from the URL on the client. Keeping these
 * here lets the page itself be fully static (served from the CDN), which is the
 * most robust outcome on Netlify — there is no SSR function to mis-route.
 *
 * Must be rendered inside a <Suspense> boundary (useSearchParams requirement).
 */
export default function LoginParams() {
  const sp = useSearchParams();
  const from = sp.get("from") ?? "/";
  const failed = sp.get("error") === "1";

  return (
    <>
      <input type="hidden" name="from" value={from} />
      {failed ? (
        <p className="login-error">Palavra-passe incorrecta.</p>
      ) : null}
    </>
  );
}
