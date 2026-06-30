"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ago } from "@/components/mission/bits";
import { setDecisionStatus } from "@/app/(main)/actions";

export interface JobArtifact {
  path: string;
  bytes: number;
  preview: string;
}

export interface Job {
  id: string;
  task_id: string;
  step: number;
  status: string;
  prompt: string;
  output: string | null;
  error: string | null;
  created_at: string;
  progress_log: string[] | null;
  artifacts: JobArtifact[] | null;
  requires_approval: boolean;
  approved_at: string | null;
  /** Linked job-step decision (present only for gated jobs). */
  decision_id?: string;
  decision_status?: string;
}

const STATUS_LABEL: Record<string, string> = {
  queued: "em fila",
  running: "a executar",
  done: "concluído",
  error: "erro",
};

/** Human-readable bytes. */
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** One job as a microcard: task + state + (expandable) progress, result, artifacts. */
function JobCard({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const router = useRouter();

  const result = job.error ?? job.output ?? "";
  const isError = Boolean(job.error);
  const long = result.length > 160;
  const shown = open || !long ? result : `${result.slice(0, 160)}…`;
  const status = STATUS_LABEL[job.status] ? job.status : "queued";

  const progress = job.progress_log ?? [];
  const artifacts = job.artifacts ?? [];
  // A gated job is "awaiting approval" while queued and not yet approved.
  const awaiting =
    job.requires_approval &&
    !job.approved_at &&
    job.status === "queued" &&
    job.decision_status !== "aprovada";

  const approve = () => {
    if (!job.decision_id) return;
    start(async () => {
      await setDecisionStatus(job.decision_id!, "aprovada");
      router.refresh();
    });
  };

  return (
    <div className="job-card">
      <div className="job-card-head">
        <span className="job-task">{job.task_id}</span>
        {job.step ? <span className="job-step">passo {job.step}</span> : null}
        <span className={`job-badge job-${status}`}>
          {status === "running" ? <span className="job-pulse" /> : null}
          {STATUS_LABEL[status]}
        </span>
        {awaiting ? (
          <span className="job-badge job-approval">requer aprovação</span>
        ) : null}
        <span className="job-date">{ago(job.created_at)}</span>
      </div>

      {awaiting ? (
        <div className="job-approval-row">
          <span className="meta">Este step aguarda aprovação humana.</span>
          {job.decision_id ? (
            <>
              <button
                type="button"
                className="action"
                onClick={approve}
                disabled={busy}
              >
                {busy ? "A aprovar…" : "Aprovar step"}
              </button>
              <Link className="job-decision-link" href={`/decisions/${job.decision_id}`}>
                ver decisão →
              </Link>
            </>
          ) : (
            <span className="meta">A criar decisão…</span>
          )}
        </div>
      ) : null}

      {progress.length ? (
        <details className="job-progress">
          <summary>Progresso ({progress.length})</summary>
          <ul className="job-progress-list">
            {progress.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}

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

      {artifacts.length ? (
        <details className="job-artifacts">
          <summary>Artefactos ({artifacts.length})</summary>
          <ul className="job-artifacts-list">
            {artifacts.map((a, i) => (
              <li key={i} className="job-artifact">
                <span className="job-artifact-path">{a.path}</span>
                <span className="job-artifact-size">{fmtBytes(a.bytes)}</span>
                {a.preview ? (
                  <pre className="job-artifact-preview">{a.preview}</pre>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Jobs list + "new job" form (ADR-0002). The server page passes the latest jobs
 * (with progress_log, artifacts and the linked approval decision); this island
 * re-fetches them every 5s via router.refresh() (the jobs table is service-role
 * only, so the browser can't subscribe directly — polling through the server is
 * the right seam). Progress streams in as the worker appends to progress_log.
 */
export default function JobsPanel({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const [taskId, setTaskId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  // Auto-refresh the list every 5 seconds (progress + status polling).
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
        body: JSON.stringify({
          task_id: taskId,
          prompt,
          requires_approval: requiresApproval,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOk(true);
        setMsg(`Job enfileirado (${data.job_id}).`);
        setTaskId("");
        setPrompt("");
        setRequiresApproval(false);
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
        <label className="jobs-check">
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
          />
          <span>Requer aprovação humana antes de executar</span>
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
