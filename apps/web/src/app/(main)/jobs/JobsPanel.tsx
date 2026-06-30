"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ago } from "@/components/mission/bits";

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

const STATUS_LABEL: Record<string, string> = {
  queued: "em fila",
  running: "a executar",
  done: "concluído",
  error: "erro",
};

/** One job as a microcard: task + state badge + relative date + (expandable) result. */
function JobCard({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const result = job.error ?? job.output ?? "";
  const isError = Boolean(job.error);
  const long = result.length > 160;
  const shown = open || !long ? result : `${result.slice(0, 160)}…`;
  const status = STATUS_LABEL[job.status] ? job.status : "queued";

  return (
    <div className="job-card">
      <div className="job-card-head">
        <span className="job-task">{job.task_id}</span>
        {job.step ? <span className="job-step">passo {job.step}</span> : null}
        <span className={`job-badge job-${status}`}>
          {status === "running" ? <span className="job-pulse" /> : null}
          {STATUS_LABEL[status]}
        </span>
        <span className="job-date">{ago(job.created_at)}</span>
      </div>

      {result ? (
        <div className={`job-result${isError ? " job-result-error" : ""}`}>
          {shown}
          {long ? (
            <button
              type="button"
              className="job-more"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "menos" : "ver mais"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Jobs list + "new job" form (ADR-0002 POC). The server page passes the latest
 * jobs; this island re-fetches them every 5s via router.refresh() (the jobs
 * table is service-role only, so the browser can't subscribe directly — polling
 * through the server is the right seam for now).
 */
export default function JobsPanel({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const [taskId, setTaskId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
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
        setOk(true);
        setMsg(`Job enfileirado (${data.job_id}).`);
        setTaskId("");
        setPrompt("");
        router.refresh();
      } else {
        setOk(false);
        setMsg(data.error ?? `Erro ${res.status}.`);
      }
    });
  };

  return (
    <div className="jobs-page">
      <form className="jobs-form" onSubmit={submit}>
        <p className="jobs-form-title">Novo job</p>
        <label className="jobs-field">
          <span className="jobs-label">task_id</span>
          <input
            className="jobs-input"
            placeholder="ex.: AT-0008"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            required
          />
        </label>
        <label className="jobs-field">
          <span className="jobs-label">Prompt para o worker</span>
          <textarea
            className="jobs-input jobs-textarea"
            placeholder="O que o worker deve processar…"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </label>
        <div className="jobs-form-foot">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "A enfileirar…" : "Enfileirar job"}
          </button>
          {msg ? (
            <span className={`jobs-msg${ok ? " jobs-msg-ok" : ""}`}>{msg}</span>
          ) : null}
        </div>
      </form>

      {jobs.length === 0 ? (
        <p className="jobs-empty">Ainda não há jobs em execução.</p>
      ) : (
        <div className="jobs-list">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  );
}
