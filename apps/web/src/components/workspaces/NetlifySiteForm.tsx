"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWorkspaceNetlifySite } from "@/app/(main)/workspaces/[workspaceId]/actions";

/**
 * Link a Netlify site to the workspace so its deploys land on the Timeline
 * (Bloco F). The auth token lives server-side; only the site id is stored.
 */
export default function NetlifySiteForm({
  workspaceId,
  current,
}: {
  workspaceId: string;
  current: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const save = () =>
    start(async () => {
      const r = await setWorkspaceNetlifySite(workspaceId, value);
      setMsg(r.message);
      router.refresh();
    });

  return (
    <div className="tl-netlify">
      <label className="tl-netlify-label">
        Site Netlify <span className="meta">— deploys na timeline</span>
      </label>
      <div className="tl-netlify-row">
        <input
          className="tl-netlify-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="site id ou nome (ex.: atelier-app)"
        />
        <button type="button" className="action" onClick={save} disabled={busy}>
          Guardar
        </button>
      </div>
      {msg ? <p className="meta mt-1">{msg}</p> : null}
    </div>
  );
}
