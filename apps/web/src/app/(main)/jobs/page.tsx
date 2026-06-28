import { getSupabaseAdmin } from "@/lib/supabase-admin";
import JobsPanel, { type Job } from "./JobsPanel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Jobs — ATELIER" };

/**
 * Jobs — POC surface for the execution runtime (ADR-0002).
 *
 * Lists the most recent jobs and lets you enqueue a test one. The list is read
 * server-side with the service role (the table is RLS-locked to it); the client
 * panel handles the form and the 5s auto-refresh.
 */
export default async function JobsPage() {
  const admin = getSupabaseAdmin();
  let jobs: Job[] = [];
  let unmanageable = false;

  if (!admin) {
    unmanageable = true;
  } else {
    const { data } = await admin
      .from("jobs")
      .select("id, task_id, step, status, prompt, output, error, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    jobs = (data ?? []) as Job[];
  }

  return (
    <div>
      <header className="mb-10">
        <p className="atelier-date">Ferramentas</p>
        <h1 className="atelier-title">Jobs</h1>
        <p className="atelier-subtitle">
          Fila de execução do runtime (ADR-0002). O ATELIER enfileira; o worker
          executa.
        </p>
      </header>

      {unmanageable ? (
        <p className="panel p-4 meta">
          Define SUPABASE_SERVICE_ROLE_KEY no ambiente para ler e criar jobs (a
          tabela está fechada por RLS ao service role).
        </p>
      ) : (
        <JobsPanel jobs={jobs} />
      )}
    </div>
  );
}
