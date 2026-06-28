"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface Job {
  id: string;
  task_id: string;
  step: number;
  status: string;
  prompt: string;
  output: string | null;
  error: string | null;
  created_at: string;
}

const STATUS_CLASS: Record<string, string> = {
  queued: "job-status queued",
  running: "job-status running",
  done: "job-status done",
  error: "job-status error",
};

function fmt(ts: string): string {
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

/**
 * Jobs list + "new test job" form (ADR-0002 POC). The server page passes the
 * latest jobs; this island re-fetches them every 5s via router.refresh() (the
 * jobs table is service-role only, so the browser can't subscribe directly —
 * polling through the server is the right seam for now).
 */
export default function JobsPanel({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const [taskId, setTaskId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Auto-refresh the list every 5 seconds.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(`Job criado (${data.job_id}).`);
        setTaskId("");
        setPrompt("");
        router.refresh();
      } else {
        setMsg(data.error ?? `Erro ${res.status}.`);
      }
    });
  };

  return (
    <div className="jobs-page">
      <form className="card jobs-form" onSubmit={submit}>
        <p className="card-label">Novo job (teste)</p>
        <input
          className="jobs-input"
          placeholder="task_id (ex.: AT-0008)"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          required
        />
        <textarea
          className="jobs-input"
          placeholder="Prompt para o worker…"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
        />
        <div className="jobs-form-foot">
          <button type="submit" className="action" disabled={pending}>
            {pending ? "A enfileirar…" : "Enfileirar job"}
          </button>
          {msg ? <span className="meta">{msg}</span> : null}
        </div>
      </form>

      {jobs.length === 0 ? (
        <p className="atelier-empty">Ainda não há jobs. Cria um acima.</p>
      ) : (
        <div className="jobs-table-wrap">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Passo</th>
                <th>Estado</th>
                <th>Resultado</th>
                <th>Criado</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="font-mono text-[13px]">{j.task_id}</td>
                  <td>{j.step}</td>
                  <td>
                    <span className={STATUS_CLASS[j.status] ?? "job-status"}>
                      {j.status}
                    </span>
                  </td>
                  <td className="jobs-output">
                    {j.error ? (
                      <span className="job-error-text">{j.error}</span>
                    ) : (
                      j.output ?? "—"
                    )}
                  </td>
                  <td className="meta">{fmt(j.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
