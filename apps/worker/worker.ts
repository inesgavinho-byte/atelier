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

// Context agent (ADR-0004): how often to compress each active workspace, and
// how far back "active" reaches. Defaults to hourly.
const CONTEXT_INTERVAL_MS = Number(process.env.WORKER_CONTEXT_MS ?? 3_600_000);
const CONTEXT_WINDOW_MS = Number(process.env.WORKER_CONTEXT_WINDOW_MS ?? 3_600_000);

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

/* ── Context agent (ADR-0004) ─────────────────────────────────────────────── */

interface ContextSummary {
  summary: string;
  decisions: { title: string; status: string }[];
  artifacts: { title: string; kind: string }[];
  lessons: string[];
}

/** Summarise a workspace conversation via Anthropic (Haiku — cheap). */
async function summarise(
  workspaceName: string,
  convo: string
): Promise<ContextSummary | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("[context] ANTHROPIC_API_KEY em falta — agente inativo.");
    return null;
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.WORKER_CONTEXT_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        "És o agente de contexto do ATELIER. Resume a conversa de forma comprimida " +
        "e útil para continuar o trabalho. Responde APENAS com JSON válido, sem texto " +
        "à volta, com as chaves: summary (string, 2-3 frases sobre o estado do " +
        "projecto), decisions (array de {title, status}), artifacts (array de " +
        "{title, kind}), lessons (string[] com aprendizagens chave). Português europeu.",
      messages: [
        {
          role: "user",
          content: `Workspace: ${workspaceName}\n\nConversa da última hora:\n${convo}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`[context] Anthropic HTTP ${res.status}`);
    return null;
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(text) as Partial<ContextSummary>;
    return {
      summary: parsed.summary ?? "",
      decisions: parsed.decisions ?? [],
      artifacts: parsed.artifacts ?? [],
      lessons: parsed.lessons ?? [],
    };
  } catch {
    // Model didn't return clean JSON — keep the prose as the summary.
    return { summary: text, decisions: [], artifacts: [], lessons: [] };
  }
}

/** One pass: refresh the compressed context of every recently-active workspace. */
async function contextTick(): Promise<void> {
  const since = new Date(Date.now() - CONTEXT_WINDOW_MS).toISOString();
  const { data: workspaces, error } = await sb
    .from("workspaces")
    .select("id, name");
  if (error || !workspaces) return;

  for (const ws of workspaces) {
    // The canonical (project-less) chat is the workspace conversation.
    const { data: chat } = await sb
      .from("workspace_chats")
      .select("id")
      .eq("workspace_id", ws.id)
      .is("project_id", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!chat) continue;

    const { data: msgs } = await sb
      .from("workspace_messages")
      .select("role, content, created_at")
      .eq("chat_id", chat.id)
      .gte("created_at", since)
      .order("created_at", { ascending: true });
    if (!msgs || msgs.length === 0) continue;

    const convo = msgs.map((m) => `${m.role}: ${m.content}`).join("\n");
    const result = await summarise(ws.name, convo);
    if (!result) continue;

    const { data: existing } = await sb
      .from("workspace_context")
      .select("version")
      .eq("workspace_id", ws.id)
      .maybeSingle();
    const version = (existing?.version ?? 0) + 1;

    const { error: upErr } = await sb.from("workspace_context").upsert(
      {
        workspace_id: ws.id,
        summary: result.summary,
        decisions: result.decisions,
        artifacts: result.artifacts,
        lessons: result.lessons,
        last_updated_at: now(),
        version,
      },
      { onConflict: "workspace_id" }
    );
    if (upErr) console.error(`[context] upsert falhou (${ws.name}): ${upErr.message}`);
    else console.log(`[context] ${ws.name} → contexto v${version}`);
  }
}

async function contextAgentLoop(): Promise<void> {
  console.log(`[context] agente de contexto a cada ${CONTEXT_INTERVAL_MS} ms.`);
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    try {
      await contextTick();
    } catch (e) {
      console.error("[context] tick falhou:", e);
    }
    await sleep(CONTEXT_INTERVAL_MS);
  }
}

async function main(): Promise<void> {
  console.log(`[worker] iniciado — poll a cada ${POLL_MS} ms.`);
  // Context agent runs in parallel with the jobs loop.
  void contextAgentLoop();
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
