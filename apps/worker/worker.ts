import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

/**
 * ATELIER execution worker (ADR-0002, POC).
 *
 * Polls the `jobs` queue and "runs" each queued job. In this proof of concept
 * the execution is SIMULATED (a delay + mock output) — the real step will shell
 * out to the Claude Code CLI in an isolated workspace. Runs on Railway, never
 * on Netlify. Uses the SERVICE ROLE key only (the jobs table is RLS-locked to
 * it); the anon key is never used here.
 */

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "[worker] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios."
  );
  process.exit(1);
}

const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 5000);
const SIMULATE_MS = Number(process.env.WORKER_SIMULATE_MS ?? 3000);
const BATCH = 5;

interface Job {
  id: string;
  task_id: string;
  step: number;
  prompt: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();

/** Atomically claim a queued job (guards against two workers taking the same). */
async function claim(job: Job): Promise<boolean> {
  const { data, error } = await sb
    .from("jobs")
    .update({ status: "running", updated_at: now() })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id");
  if (error) {
    console.error(`[worker] claim falhou (${job.id}): ${error.message}`);
    return false;
  }
  return Boolean(data && data.length);
}

async function runJob(job: Job): Promise<void> {
  if (!(await claim(job))) return; // already taken / gone

  try {
    // —— Simulated execution. Replace with the Claude Code CLI subprocess. ——
    await sleep(SIMULATE_MS);
    const output = `Mock output para prompt: ${job.prompt.slice(0, 100)}`;

    const { error } = await sb
      .from("jobs")
      .update({ status: "done", output, updated_at: now() })
      .eq("id", job.id);
    if (error) throw new Error(error.message);
    console.log(`[worker] job ${job.id} (${job.task_id}#${job.step}) done`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await sb
      .from("jobs")
      .update({ status: "error", error: message, updated_at: now() })
      .eq("id", job.id);
    console.error(`[worker] job ${job.id} error: ${message}`);
  }
}

async function tick(): Promise<void> {
  const { data, error } = await sb
    .from("jobs")
    .select("id, task_id, step, prompt")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (error) {
    console.error(`[worker] poll falhou: ${error.message}`);
    return;
  }
  for (const job of (data ?? []) as Job[]) {
    await runJob(job);
  }
}

async function main(): Promise<void> {
  console.log(`[worker] iniciado — poll a cada ${POLL_MS} ms.`);
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error("[worker] tick falhou:", e);
    }
    await sleep(POLL_MS);
  }
}

main();
