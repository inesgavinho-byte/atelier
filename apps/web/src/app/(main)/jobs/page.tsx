import { getSupabaseAdmin, serviceRoleStatus } from "@/lib/supabase-admin";
import JobsPanel, { type Job } from "./JobsPanel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Jobs — ATELIER" };

/**
 * Jobs — POC surface for the execution runtime (ADR-0002).
 *
 * The list is read SERVER-SIDE with the service role (getSupabaseAdmin) because
 * the jobs table is RLS-locked to it. We surface three distinct states so an
 * empty list is never ambiguous: no service role, a key that is not actually a
 * service-role key (RLS then returns zero rows with no error), and a read
 * error. Only when the read genuinely returns nothing do we show "no jobs".
 */
export default async function JobsPage() {
  const admin = getSupabaseAdmin();
  const role = serviceRoleStatus();

  let jobs: Job[] = [];
  let readError: string | null = null;

  if (admin) {
    const { data, error } = await admin
      .from("jobs")
      .select("id, task_id, step, status, prompt, output, error, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) readError = error.message;
    else jobs = (data ?? []) as Job[];
  }

  return (
    <div>
      <header className="mb-10">
        <p className="atelier-date">Ferramentas</p>
        <h1 className="atelier-title">Jobs</h1>
        <p className="atelier-subtitle">
          Fila de execução do runtime. Tarefas enviadas ao worker para
          processamento — base para a execução autónoma do Council (ADR-0002).
        </p>
      </header>

      {!admin ? (
        <p className="panel p-4 meta">
          Define SUPABASE_SERVICE_ROLE_KEY no ambiente para ler e criar jobs (a
          tabela está fechada por RLS ao service role).
        </p>
      ) : (
        <>
          {!role.isServiceRole ? (
            <p className="panel p-4 meta mb-6">
              A leitura usa o service role, mas {role.note} Com a chave errada o
              RLS bloqueia a leitura e a lista aparece vazia. Define a service
              role key correcta em SUPABASE_SERVICE_ROLE_KEY.
            </p>
          ) : null}
          {readError ? (
            <p className="panel p-4 meta mb-6">
              Erro ao ler jobs: {readError}
            </p>
          ) : null}
          <JobsPanel jobs={jobs} />
        </>
      )}
    </div>
  );
}
