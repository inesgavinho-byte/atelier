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
      .is("project_id", null)
      .maybeSingle();
    const version = (existing?.version ?? 0) + 1;

    const { error: upErr } = await sb.from("workspace_context").upsert(
      {
        workspace_id: ws.id,
        project_id: null,
        summary: result.summary,
        decisions: result.decisions,
        artifacts: result.artifacts,
        lessons: result.lessons,
        last_updated_at: now(),
        version,
      },
      { onConflict: "workspace_id,project_id" }
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

/* ── Minions (EPIC-003) ───────────────────────────────────────────────────── */

// How often to check which minions are due. Each minion's own cadence is
// frequency_minutes; this is just the scheduler tick.
const MINION_INTERVAL_MS = Number(process.env.WORKER_MINION_MS ?? 300_000);

interface Minion {
  id: string;
  name: string;
  slug: string;
  mission: string;
  frequency_minutes: number;
  autonomy_level: number;
  state: string;
}

interface MinionResult {
  kind: string; // 'info'|'warning'|'decision_required'|'opportunity'|'risk'
  signal: string;
  evidence: string[];
  interpretation: string;
  recommended_action: string;
  approval_required: boolean;
}

const minionShortId = (prefix: string) =>
  `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;

/** Per-minion guidance appended to the shared system prompt. */
const MINION_GUIDANCE: Record<string, string> = {
  inbox:
    "És o Inbox Decimin. Observas capturas, leituras e imports recentes. " +
    "Classifica e diz o que merece atenção. Raramente exige aprovação.",
  context:
    "És o Context Decimin. Observas o que mudou nos workspaces (decisões, " +
    "actividade). Resume o estado. Não exige aprovação.",
  decision:
    "És o Decision Decimin. Detectas o que precisa de uma decisão da Inês. " +
    "Reúne evidência e prepara uma recomendação clara. Usa kind " +
    "'decision_required' e approval_required=true quando há mesmo uma decisão.",
  "project-sentinel":
    "És o Project Sentinel. Vigias decisões pendentes, jobs com erro e " +
    "bloqueios. Sinaliza risco com kind 'risk' ou 'warning'.",
  product:
    "És o Product Decimin. Observas o estado do produto (jobs, artefactos, " +
    "decisões) e o que pode violar a arquitectura. kind 'warning' ou 'info'.",
  pattern:
    "És o Pattern Decimin. Observas o contexto de TODOS os workspaces e " +
    "procuras padrões, tensões e oportunidades. kind 'opportunity' ou 'info'.",
};

/** Build a compact text view of a minion's sources. Empty string ⇒ skip run. */
async function gatherMinionContext(slug: string): Promise<string> {
  const lines: string[] = [];
  const push = (label: string, rows: { toString: () => string }[]) => {
    if (rows.length) lines.push(`## ${label}\n${rows.join("\n")}`);
  };

  if (slug === "inbox") {
    const [{ data: caps }, { data: reads }, { data: imps }] = await Promise.all([
      sb.from("captures").select("kind, value, created_at").order("created_at", { ascending: false }).limit(15),
      sb.from("readings").select("title, status, created_at").eq("status", "Por ler").order("created_at", { ascending: false }).limit(15),
      sb.from("context_imports").select("source, created_at").order("created_at", { ascending: false }).limit(10),
    ]);
    push("Capturas recentes", (caps ?? []).map((c) => `- [${c.kind}] ${String(c.value).slice(0, 120)}`));
    push("Leituras por ler", (reads ?? []).map((r) => `- ${r.title ?? "(sem título)"}`));
    push("Imports recentes", (imps ?? []).map((i) => `- ${i.source}`));
  } else if (slug === "context") {
    const [{ data: decs }, { data: acts }] = await Promise.all([
      sb.from("decisions").select("title, status, updated_at").order("updated_at", { ascending: false }).limit(10),
      sb.from("activity").select("kind, title, at").order("at", { ascending: false }).limit(20),
    ]);
    push("Decisões recentes", (decs ?? []).map((d) => `- ${d.title} (${d.status})`));
    push("Actividade", (acts ?? []).map((a) => `- [${a.kind}] ${a.title}`));
  } else if (slug === "decision") {
    const [{ data: pend }, { data: jobs }, { data: imps }] = await Promise.all([
      sb.from("decisions").select("title, context, recommendation").eq("status", "pendente").limit(15),
      sb.from("jobs").select("prompt, output, status").eq("status", "done").order("updated_at", { ascending: false }).limit(8),
      sb.from("context_imports").select("source, created_at").order("created_at", { ascending: false }).limit(5),
    ]);
    push("Decisões pendentes", (pend ?? []).map((d) => `- ${d.title}`));
    push("Jobs concluídos", (jobs ?? []).map((j) => `- ${String(j.prompt).slice(0, 100)}`));
    push("Imports", (imps ?? []).map((i) => `- ${i.source}`));
  } else if (slug === "project-sentinel") {
    const [{ data: pend }, { data: errs }, { data: wss }] = await Promise.all([
      sb.from("decisions").select("title").eq("status", "pendente").limit(20),
      sb.from("jobs").select("prompt, error").eq("status", "error").order("updated_at", { ascending: false }).limit(10),
      sb.from("workspaces").select("name").limit(30),
    ]);
    push("Decisões pendentes", (pend ?? []).map((d) => `- ${d.title}`));
    push("Jobs com erro", (errs ?? []).map((j) => `- ${String(j.prompt).slice(0, 80)} → ${j.error ?? ""}`));
    push("Workspaces", (wss ?? []).map((w) => `- ${w.name}`));
  } else if (slug === "product") {
    const [{ data: jobs }, { data: arts }, { data: decs }] = await Promise.all([
      sb.from("jobs").select("prompt, status").order("updated_at", { ascending: false }).limit(10),
      sb.from("artifacts").select("title, kind, state").order("updated_at", { ascending: false }).limit(20),
      sb.from("decisions").select("title, kind").order("updated_at", { ascending: false }).limit(10),
    ]);
    push("Jobs", (jobs ?? []).map((j) => `- [${j.status}] ${String(j.prompt).slice(0, 80)}`));
    push("Artefactos", (arts ?? []).map((a) => `- ${a.title} (${a.kind}, ${a.state})`));
    push("Decisões", (decs ?? []).map((d) => `- ${d.title}`));
  } else if (slug === "pattern") {
    const [{ data: ctxs }, { data: arts }] = await Promise.all([
      sb.from("workspace_context").select("workspace_id, summary").is("project_id", null).limit(40),
      sb.from("artifacts").select("title, kind").order("updated_at", { ascending: false }).limit(30),
    ]);
    push("Contexto dos workspaces", (ctxs ?? []).map((c) => `- ${String(c.summary).slice(0, 200)}`));
    push("Artefactos", (arts ?? []).map((a) => `- ${a.title}`));
  }

  return lines.join("\n\n").trim();
}

/** Run a minion's analysis via Anthropic (Haiku). Returns null when inactive. */
async function runMinionLLM(
  minion: Minion,
  context: string
): Promise<MinionResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("[minion] ANTHROPIC_API_KEY em falta — minions inactivos.");
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
      model: process.env.WORKER_MINION_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        `${MINION_GUIDANCE[minion.slug] ?? minion.mission}\n\n` +
        "Os Minions observam, organizam e propõem — NUNCA decidem nem agem " +
        "sozinhos. Responde APENAS com JSON válido, sem texto à volta, com as " +
        "chaves: kind ('info'|'warning'|'decision_required'|'opportunity'|'risk'), " +
        "signal (string curta), evidence (string[]), interpretation (string), " +
        "recommended_action (string), approval_required (boolean). Português europeu. " +
        "Se não houver nada digno de nota, devolve kind 'info' e signal vazio.",
      messages: [
        { role: "user", content: `Minion: ${minion.name}\n\nFontes:\n${context}` },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`[minion] Anthropic HTTP ${res.status} (${minion.slug})`);
    return null;
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const p = JSON.parse(text) as Partial<MinionResult>;
    if (!p.signal || !String(p.signal).trim()) return null; // nothing to report
    return {
      kind: p.kind ?? "info",
      signal: String(p.signal),
      evidence: Array.isArray(p.evidence) ? p.evidence.map(String) : [],
      interpretation: p.interpretation ?? "",
      recommended_action: p.recommended_action ?? "",
      approval_required: Boolean(p.approval_required),
    };
  } catch {
    return null;
  }
}

/** Execute one minion: gather → analyse → store signal (+ decision/activity). */
async function runMinion(minion: Minion): Promise<void> {
  const nextRun = new Date(
    Date.now() + minion.frequency_minutes * 60_000
  ).toISOString();
  try {
    const context = await gatherMinionContext(minion.slug);
    const result = context ? await runMinionLLM(minion, context) : null;

    if (result) {
      await sb.from("minion_signals").insert({
        minion_id: minion.id,
        kind: result.kind,
        signal: result.signal,
        evidence: result.evidence,
        interpretation: result.interpretation,
        recommended_action: result.recommended_action,
        approval_required: result.approval_required,
      });

      // Recommend (autonomy ≥ 3): turn an approval-required signal into a
      // pending decision card. Always internal, always 'pendente'.
      if (result.approval_required && minion.autonomy_level >= 3) {
        await sb.from("decisions").insert({
          id: minionShortId("min"),
          title: result.signal.slice(0, 120),
          kind: "direção",
          priority: "média",
          context: result.interpretation,
          recommendation: result.recommended_action,
          status: "pendente",
        });
      }
      // Informational signals also land on the activity timeline.
      if (result.kind === "info") {
        await sb.from("activity").insert({
          id: minionShortId("act"),
          kind: "agente",
          title: `${minion.name}: ${result.signal}`.slice(0, 160),
          at: now(),
        });
      }
    }

    await sb
      .from("minions")
      .update({
        last_run_at: now(),
        next_run_at: nextRun,
        last_signal: result ?? null,
        state: "active",
        last_error: null,
        updated_at: now(),
      })
      .eq("id", minion.id);
    console.log(
      `[minion] ${minion.slug} → ${result ? result.kind : "sem sinal"}`
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await sb
      .from("minions")
      .update({
        last_run_at: now(),
        next_run_at: nextRun,
        state: "error",
        last_error: message,
        updated_at: now(),
      })
      .eq("id", minion.id);
    console.error(`[minion] ${minion.slug} erro: ${message}`);
  }
}

/** One scheduler pass: run every active minion whose next_run_at is due. */
async function minionTick(): Promise<void> {
  const { data, error } = await sb
    .from("minions")
    .select("id, name, slug, mission, frequency_minutes, autonomy_level, state")
    .eq("state", "active")
    .or(`next_run_at.is.null,next_run_at.lte.${now()}`);
  if (error) {
    console.error(`[minion] poll falhou: ${error.message}`);
    return;
  }
  for (const minion of (data ?? []) as Minion[]) {
    await runMinion(minion);
  }
}

async function minionLoop(): Promise<void> {
  console.log(`[minion] scheduler a cada ${MINION_INTERVAL_MS} ms.`);
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    try {
      await minionTick();
    } catch (e) {
      console.error("[minion] tick falhou:", e);
    }
    await sleep(MINION_INTERVAL_MS);
  }
}

/* ── Telegram (ADR-0003) ──────────────────────────────────────────────────── */

// Degrades gracefully: without TELEGRAM_BOT_TOKEN the loop never starts.
// TELEGRAM_CHAT_ID restricts who can command the bot and is the target for
// proactive notifications. Long-poll updates; notify on a slower beat.
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
// Conversation Watch (ADR-0006): the daily briefing goes to Inês's own chat.
// Falls back to TELEGRAM_CHAT_ID, which is already her chat in the common setup.
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID || TELEGRAM_CHAT_ID;
const TELEGRAM_NOTIFY_MS = Number(process.env.WORKER_TELEGRAM_NOTIFY_MS ?? 60_000);

async function tg(method: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => null);
}

function tgSend(chatId: number | string, text: string, extra: Record<string, unknown> = {}) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

/** A pending decision's inline approve/review keyboard. */
function decisionKeyboard(id: string) {
  return {
    inline_keyboard: [
      [
        { text: "✓ Aprovar", callback_data: `approve:${id}` },
        { text: "↻ Rever", callback_data: `review:${id}` },
      ],
    ],
  };
}

async function tgPendingDecisions(): Promise<{ id: string; title: string }[]> {
  const { data } = await sb
    .from("decisions")
    .select("id, title")
    .eq("status", "pendente")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as { id: string; title: string }[];
}

async function handleTelegramText(chatId: number, text: string): Promise<void> {
  const trimmed = text.trim();
  const [token, ...rest] = trimmed.split(/\s+/);
  const cmd = token.toLowerCase();
  const arg = rest.join(" ").trim();

  if (cmd === "/start" || cmd === "/ajuda" || cmd === "/help") {
    await tgSend(
      chatId,
      "<b>ATELIER</b>\n/hoje — decisões pendentes\n/decisoes — aprovar/rever\n" +
        "/pendentes — pedidos por responder (Conversation Watch)\n" +
        "/resolver <i>código</i> — marca um pendente como resolvido\n" +
        "/grupos — grupos observados\n" +
        "Qualquer outra mensagem é guardada como captura."
    );
    return;
  }

  if (cmd === "/hoje" || cmd === "/decisoes" || cmd === "/decisões") {
    const pending = await tgPendingDecisions();
    if (!pending.length) {
      await tgSend(chatId, "Sem decisões pendentes. ✨");
      return;
    }
    await tgSend(chatId, `<b>${pending.length} decisão(ões) pendente(s)</b>`);
    for (const d of pending) {
      await tgSend(chatId, `• ${d.title}`, { reply_markup: decisionKeyboard(d.id) });
    }
    return;
  }

  // —— Conversation Watch commands (ADR-0006) ——
  if (cmd === "/pendentes") {
    await tgSend(chatId, await formatPendingBriefing(false));
    return;
  }
  if (cmd === "/resolver") {
    await tgSend(chatId, await resolvePendingItem(arg));
    return;
  }
  if (cmd === "/grupos") {
    await tgSend(chatId, await formatGroupsList());
    return;
  }

  // Anything else → capture (nothing is lost).
  await sb.from("captures").insert({ kind: "texto", value: text });
  await tgSend(chatId, "Capturado. ✓");
}

async function handleTelegramCallback(cb: any): Promise<void> {
  const data = String(cb.data ?? "");
  const chatId = cb.message?.chat?.id;
  const [action, id] = data.split(":");
  if ((action === "approve" || action === "review") && id) {
    const status = action === "approve" ? "aprovada" : "revisão";
    await sb.from("decisions").update({ status, updated_at: now() }).eq("id", id);
    await tg("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: action === "approve" ? "Aprovada" : "Em revisão",
    });
    if (chatId)
      await tgSend(chatId, `Decisão ${action === "approve" ? "aprovada ✓" : "em revisão ↻"}.`);
  } else {
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "" });
  }
}

/** Whether a chat is allowed to command the bot (when a chat id is configured). */
function tgAllowed(chatId: number | string | undefined): boolean {
  if (!TELEGRAM_CHAT_ID) return true; // not locked down yet
  return String(chatId) === String(TELEGRAM_CHAT_ID);
}

async function telegramLoop(): Promise<void> {
  if (!TELEGRAM_TOKEN) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN em falta — bot inactivo.");
    return;
  }
  console.log("[telegram] bot activo (long-poll).");
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    try {
      const r = await tg("getUpdates", { offset, timeout: 25 });
      for (const u of r?.result ?? []) {
        offset = u.update_id + 1;
        try {
          const chatType = u.message?.chat?.type ?? u.my_chat_member?.chat?.type;
          const isGroup = chatType === "group" || chatType === "supergroup";
          if (u.my_chat_member) {
            // Bot added to / removed from a group (Conversation Watch, ADR-0006).
            await handleMyChatMember(u.my_chat_member);
          } else if (u.callback_query && tgAllowed(u.callback_query.message?.chat?.id)) {
            await handleTelegramCallback(u.callback_query);
          } else if (u.message?.text && isGroup) {
            // Observe a group the bot was explicitly added to — no commands here.
            await processGroupMessage(u.message);
          } else if (u.message?.text && tgAllowed(u.message.chat?.id)) {
            await handleTelegramText(u.message.chat.id, u.message.text);
          }
        } catch (e) {
          console.error("[telegram] update falhou:", e);
        }
      }
    } catch (e) {
      console.error("[telegram] getUpdates falhou:", e);
      await sleep(5000);
    }
  }
}

/** Proactive notifications: new pending decisions + minion signals → the chat. */
async function telegramNotifyLoop(): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  // Start the watermark at "now" so we only notify about genuinely new items.
  let since = now();
  console.log(`[telegram] notificações a cada ${TELEGRAM_NOTIFY_MS} ms.`);
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    await sleep(TELEGRAM_NOTIFY_MS);
    const checkpoint = now();
    try {
      // Shadow Mode: only push when active. We still advance the watermark so
      // promoting to active later doesn't dump the backlog accumulated silently.
      const active = (await capabilityMode("watch_notifications")) === "active";

      const { data: decs } = await sb
        .from("decisions")
        .select("id, title")
        .eq("status", "pendente")
        .gt("created_at", since)
        .limit(10);
      if (active)
        for (const d of decs ?? [])
          await tgSend(
            TELEGRAM_CHAT_ID,
            `🟠 Nova decisão pendente:\n${d.title}`,
            { reply_markup: decisionKeyboard(d.id) }
          );

      const { data: sigs } = await sb
        .from("minion_signals")
        .select("signal, kind")
        .eq("approval_required", true)
        .gt("created_at", since)
        .limit(10);
      if (active)
        for (const s of sigs ?? [])
          await tgSend(TELEGRAM_CHAT_ID, `🤖 Minion (${s.kind}):\n${s.signal}`);

      since = checkpoint;
    } catch (e) {
      console.error("[telegram] notify falhou:", e);
    }
  }
}

/* ── Conversation Watch (ADR-0006, Personal Decimin) ──────────────────────────
 * The Telegram bot's first Personal Decimin capability: observe groups it was
 * explicitly added to, extract pending items (requests, commitments, promised
 * files, deadlines, unanswered questions) via Claude Haiku, and deliver a daily
 * briefing. No automatic replies; no invisible monitoring (the bot is a named,
 * visible member). Groups must have autonomy_level ≥ 2 to be analysed.
 */

interface WatchSignal {
  kind: string;
  description: string;
  from_person?: string | null;
  to_person?: string | null;
  due_date?: string | null;
  confidence?: number | null;
  confidence_reason?: string | null;
}

interface WatchGroup {
  id: string;
  workspace_id: string | null;
  project_id: string | null;
  autonomy_level: number;
  active: boolean;
}

/** Analyse one group message with Haiku. Returns [] when nothing is relevant. */
async function analyzeGroupMessage(sender: string, text: string): Promise<WatchSignal[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return [];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.WORKER_WATCH_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 700,
      system:
        "Analisa esta mensagem de um grupo de trabalho. Detecta: pedidos não " +
        "respondidos, compromissos assumidos, ficheiros prometidos, prazos " +
        "mencionados, perguntas sem resposta. Responde APENAS com JSON válido, " +
        'sem texto à volta: { "signals": [{ "kind", "description", "from_person", ' +
        '"to_person", "due_date", "confidence", "confidence_reason" }] }. kind tem de ser um de ' +
        "'request'|'commitment'|'promised_file'|'deadline'|'unanswered_question'|'decision'|'risk'. " +
        "due_date em formato YYYY-MM-DD ou null. confidence é um número entre 0 e 1 " +
        "que indica o quão certo estás de que isto é mesmo um pendente real " +
        "(1 = explícito e inequívoco; 0.5 = redacção ambígua). confidence_reason é " +
        "uma frase curta a justificar. Português europeu. Se não houver " +
        'nada relevante, responde { "signals": [] }.',
      messages: [{ role: "user", content: `${sender}: ${text}` }],
    }),
  });
  if (!res.ok) {
    console.error(`[watch] Anthropic HTTP ${res.status}`);
    return [];
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const raw = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(raw) as { signals?: WatchSignal[] };
    const signals = Array.isArray(parsed.signals) ? parsed.signals : [];
    return signals
      .filter((s) => s && s.kind && s.description)
      .map((s) => ({
        kind: String(s.kind),
        description: String(s.description),
        from_person: s.from_person ? String(s.from_person) : null,
        to_person: s.to_person ? String(s.to_person) : null,
        due_date:
          s.due_date && /^\d{4}-\d{2}-\d{2}$/.test(String(s.due_date))
            ? String(s.due_date)
            : null,
        confidence:
          typeof s.confidence === "number"
            ? Math.max(0, Math.min(1, s.confidence))
            : null,
        confidence_reason: s.confidence_reason
          ? String(s.confidence_reason)
          : null,
      }));
  } catch {
    return [];
  }
}

/** Find or lazily register the group (being a member ⇒ explicitly added). */
async function ensureGroup(chat: {
  id: number;
  title?: string;
}): Promise<WatchGroup | null> {
  const { data: existing } = await sb
    .from("telegram_groups")
    .select("id, workspace_id, project_id, autonomy_level, active")
    .eq("telegram_chat_id", chat.id)
    .maybeSingle();
  if (existing) return existing as WatchGroup;
  const { data } = await sb
    .from("telegram_groups")
    .insert({ telegram_chat_id: chat.id, title: chat.title ?? "Grupo" })
    .select("id, workspace_id, project_id, autonomy_level, active")
    .maybeSingle();
  if (data) console.log(`[watch] grupo registado: ${chat.title ?? chat.id}`);
  return (data as WatchGroup) ?? null;
}

/** Bot added to / removed from a group — keep telegram_groups in sync. */
async function handleMyChatMember(ev: any): Promise<void> {
  const chat = ev.chat;
  const status = ev.new_chat_member?.status;
  if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) return;
  if (status === "member" || status === "administrator") {
    const { data: existing } = await sb
      .from("telegram_groups")
      .select("id")
      .eq("telegram_chat_id", chat.id)
      .maybeSingle();
    if (existing) {
      await sb
        .from("telegram_groups")
        .update({ active: true, title: chat.title ?? "Grupo" })
        .eq("id", existing.id);
    } else {
      await sb
        .from("telegram_groups")
        .insert({ telegram_chat_id: chat.id, title: chat.title ?? "Grupo" });
    }
    console.log(`[watch] bot adicionado a ${chat.title ?? chat.id}`);
    if (TELEGRAM_USER_ID)
      await tgSend(
        TELEGRAM_USER_ID,
        `👀 Conversation Watch activo em <b>${chat.title ?? "grupo"}</b>.`
      );
  } else if (status === "left" || status === "kicked") {
    await sb
      .from("telegram_groups")
      .update({ active: false })
      .eq("telegram_chat_id", chat.id);
    console.log(`[watch] bot removido de ${chat.title ?? chat.id}`);
  }
}

/** Observe one group message: analyse, then store pending items (+ Inbox). */
async function processGroupMessage(msg: any): Promise<void> {
  const text = String(msg.text ?? "").trim();
  // Skip commands and very short chatter — keeps the Haiku budget on substance.
  if (!text || text.startsWith("/") || text.length < 12) return;
  const group = await ensureGroup(msg.chat);
  if (!group || !group.active || group.autonomy_level < 2) return;

  const sender =
    [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
    msg.from?.username ||
    "Alguém";
  const signals = await analyzeGroupMessage(sender, text);
  if (!signals.length) return;

  for (const s of signals) {
    await sb.from("telegram_pending_items").insert({
      group_id: group.id,
      workspace_id: group.workspace_id ?? null,
      kind: s.kind,
      description: s.description,
      from_person: s.from_person ?? sender,
      to_person: s.to_person ?? null,
      due_date: s.due_date ?? null,
      confidence: s.confidence ?? null,
      confidence_reason: s.confidence_reason ?? null,
      source_message_id: msg.message_id ?? null,
      source_message_text: text.slice(0, 2000),
    });
    // Personal Inbox: every signal also lands as a capture (captures is global).
    await sb.from("captures").insert({ kind: "pending", value: s.description });
  }
  console.log(`[watch] ${signals.length} sinal(is) de ${sender}`);
}

interface PendingRow {
  id: string;
  description: string;
  from_person: string | null;
  kind: string;
  workspace_id: string | null;
  group_id: string;
}

const shortCode = (id: string) => id.slice(0, 8);

async function fetchPending(daily: boolean): Promise<PendingRow[]> {
  let q = sb
    .from("telegram_pending_items")
    .select("id, description, from_person, kind, workspace_id, group_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(60);
  if (daily) q = q.gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString());
  const { data } = await q;
  return (data ?? []) as PendingRow[];
}

/** Build {workspaceId→name, groupId→title} maps for the pending rows. */
async function labelMaps(rows: PendingRow[]) {
  const wsIds = Array.from(
    new Set(rows.map((r) => r.workspace_id).filter(Boolean))
  ) as string[];
  const grpIds = Array.from(new Set(rows.map((r) => r.group_id)));
  const ws = new Map<string, string>();
  const grp = new Map<string, string>();
  if (wsIds.length) {
    const { data } = await sb.from("workspaces").select("id, name").in("id", wsIds);
    for (const w of data ?? []) ws.set(w.id as string, w.name as string);
  }
  if (grpIds.length) {
    const { data } = await sb
      .from("telegram_groups")
      .select("id, title")
      .in("id", grpIds);
    for (const g of data ?? []) grp.set(g.id as string, g.title as string);
  }
  return { ws, grp };
}

/** The pending briefing, grouped by workspace/group. "" when empty (no noise). */
async function formatPendingBriefing(daily: boolean): Promise<string> {
  const rows = await fetchPending(daily);
  if (!rows.length) return daily ? "" : "Sem pedidos pendentes. ✨";
  const { ws, grp } = await labelMaps(rows);
  const grouped = new Map<string, PendingRow[]>();
  for (const r of rows) {
    const label = r.workspace_id
      ? ws.get(r.workspace_id) ?? "Workspace"
      : grp.get(r.group_id) ?? "Pessoal";
    const arr = grouped.get(label);
    if (arr) arr.push(r);
    else grouped.set(label, [r]);
  }
  const lines = [`📋 ${rows.length} pedido(s) pendente(s)`];
  for (const [label, items] of grouped) {
    lines.push(`\n<b>${label}</b>:`);
    for (const it of items) {
      const who = it.from_person ? ` (${it.from_person})` : "";
      lines.push(`  • [${shortCode(it.id)}] ${it.description}${who}`);
    }
  }
  lines.push("\nResolver: /resolver &lt;código&gt;");
  return lines.join("\n");
}

/** Mark a pending item resolved by the short code shown in /pendentes. */
async function resolvePendingItem(code: string): Promise<string> {
  const c = code.trim().toLowerCase();
  if (c.length < 4)
    return "Usa: /resolver &lt;código&gt; (os 8 caracteres mostrados em /pendentes).";
  const { data } = await sb
    .from("telegram_pending_items")
    .select("id, description")
    .eq("status", "pending")
    .limit(200);
  const match = (data ?? []).find((r: any) => String(r.id).toLowerCase().startsWith(c));
  if (!match) return `Não encontrei nenhum pendente a começar por "${c}".`;
  await sb
    .from("telegram_pending_items")
    .update({ status: "resolved", resolved_at: now() })
    .eq("id", match.id);
  return `Resolvido ✓ — ${match.description}`;
}

/** List the observed groups and their linked workspaces. */
async function formatGroupsList(): Promise<string> {
  const { data } = await sb
    .from("telegram_groups")
    .select("title, active, autonomy_level, workspace_id")
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as any[];
  if (!rows.length) return "O bot ainda não foi adicionado a nenhum grupo.";
  const wsIds = Array.from(new Set(rows.map((r) => r.workspace_id).filter(Boolean))) as string[];
  const ws = new Map<string, string>();
  if (wsIds.length) {
    const { data: wss } = await sb.from("workspaces").select("id, name").in("id", wsIds);
    for (const w of wss ?? []) ws.set(w.id as string, w.name as string);
  }
  const lines = ["<b>Grupos observados</b>"];
  for (const g of rows) {
    const link = g.workspace_id ? ws.get(g.workspace_id) ?? "—" : "Pessoal";
    const st = g.active ? `nível ${g.autonomy_level}` : "inactivo";
    lines.push(`• ${g.title} — ${link} (${st})`);
  }
  return lines.join("\n");
}

/** Current Europe/Lisbon wall-clock time as seconds since midnight (DST-safe). */
function lisbonSecondsOfDay(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return get("hour") * 3600 + get("minute") * 60 + get("second");
}

function msUntilNextBriefing(): number {
  const target = 9 * 3600; // 09:00 Lisboa
  let delta = target - lisbonSecondsOfDay();
  if (delta <= 0) delta += 24 * 3600;
  return delta * 1000;
}

/* ── Shadow Mode (Personal Decimin v2) ────────────────────────────────────────
 * Each capability has a mode: 'active' (acts/notifies), 'shadow' (computes but
 * stays silent, recording what it WOULD have sent so the user can compare), or
 * 'off'. New capabilities start silent and earn 'active'. Robust default:
 * 'active' on any miss/error, so a missing table never silences a working flow.
 */
type CapMode = "shadow" | "active" | "off";

async function capabilityMode(capability: string): Promise<CapMode> {
  const { data, error } = await sb
    .from("decimin_capabilities")
    .select("mode")
    .eq("capability", capability)
    .maybeSingle();
  if (error || !data) return "active";
  return (data.mode as CapMode) ?? "active";
}

/** Record what a capability would have sent, for the user to compare (shadow). */
async function recordShadowOutput(capability: string, output: string): Promise<void> {
  await sb
    .from("decimin_capabilities")
    .update({
      last_shadow_output: output.slice(0, 4000),
      last_shadow_at: now(),
      updated_at: now(),
    })
    .eq("capability", capability);
}

/**
 * Advanced Daily Briefing (Personal Decimin v2). A morning summary of what
 * changed since yesterday — new vs resolved vs still-open pendings, how many
 * are stale — plus a single recommended follow-up (the most-confident, oldest
 * open item), then the grouped list. Stays quiet when there's nothing. Honours
 * Shadow Mode: in 'shadow' it records the briefing instead of sending it.
 */
async function sendDailyBriefing(): Promise<void> {
  if (!TELEGRAM_USER_ID) return;
  const mode = await capabilityMode("daily_briefing");
  if (mode === "off") return;
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const cutoff3d = new Date(Date.now() - 3 * 86_400_000).toISOString();

  const [newRes, resolvedRes, openRes] = await Promise.all([
    sb
      .from("telegram_pending_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("created_at", since),
    sb
      .from("telegram_pending_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved")
      .gte("resolved_at", since),
    sb
      .from("telegram_pending_items")
      .select("description, from_person, confidence, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  const newCount = newRes.count ?? 0;
  const resolvedCount = resolvedRes.count ?? 0;
  const open = (openRes.data ?? []) as {
    description: string;
    from_person: string | null;
    confidence: number | null;
    created_at: string;
  }[];

  // Nothing moved and nothing open → stay quiet (no noise).
  if (!open.length && !newCount && !resolvedCount) return;

  const stale = open.filter((r) => r.created_at < cutoff3d).length;

  // Recommended follow-up: most-confident, then oldest.
  const ranked = [...open].sort((a, b) => {
    const ca = a.confidence ?? 0.5;
    const cb = b.confidence ?? 0.5;
    if (cb !== ca) return cb - ca;
    return a.created_at < b.created_at ? -1 : 1;
  });
  const top = ranked[0];

  const lines = ["🌅 <b>Bom dia.</b>", "", "Desde ontem:"];
  lines.push(`• ${newCount} novo(s) pendente(s)`);
  lines.push(`• ${resolvedCount} resolvido(s)`);
  lines.push(
    `• ${open.length} ainda por responder${stale ? ` (${stale} há mais de 3 dias)` : ""}`
  );
  if (top) {
    const who = top.from_person ? ` (${top.from_person})` : "";
    lines.push("", "Sugestão de follow-up:", `→ ${top.description}${who}`);
  }

  const list = await formatPendingBriefing(false);
  if (list && list !== "Sem pedidos pendentes. ✨") lines.push("", list);

  const text = lines.join("\n");
  if (mode === "active") {
    await tgSend(TELEGRAM_USER_ID, text);
  } else {
    // Shadow: record what we would have sent; don't interrupt.
    await recordShadowOutput("daily_briefing", text);
    console.log("[shadow] daily_briefing — preparado, não enviado.");
  }
}

async function telegramBriefingLoop(): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_USER_ID) return;
  console.log("[watch] briefing diário às 09:00 Europe/Lisbon.");
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    await sleep(msUntilNextBriefing());
    try {
      await sendDailyBriefing();
    } catch (e) {
      console.error("[watch] briefing falhou:", e);
    }
    await sleep(60_000); // step past 09:00 so we don't fire twice in the minute
  }
}

/**
 * Keep-alive for the MarkItDown service. Railway free/idle services sleep after
 * inactivity, making the first document conversion slow (cold start). A light
 * periodic /health ping keeps it warm. No-op when MARKITDOWN_URL is unset.
 */
async function markitdownKeepAliveLoop(): Promise<void> {
  const base = process.env.MARKITDOWN_URL;
  if (!base) return;
  const interval = Number(process.env.MARKITDOWN_KEEPALIVE_MS ?? 600_000); // 10 min
  const url = `${base.replace(/\/$/, "")}/health`;
  console.log(`[markitdown] keep-alive a cada ${interval} ms.`);
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      await fetch(url, { signal: ctrl.signal }).catch(() => null);
      clearTimeout(t);
    } catch {
      /* keep-alive is best-effort */
    }
    await sleep(interval);
  }
}

/* ── Embeddings backfill (RAG v2) ─────────────────────────────────────────────
 * Document chunks ingested before RAG v2 (or while OPENAI_API_KEY was unset)
 * have no embedding and are invisible to semantic search. This loop embeds them
 * in batches so they become searchable. Degrades: without OPENAI_API_KEY it
 * stays idle. Uses OpenAI embeddings directly (the gateway is web-side).
 */
const EMBED_BACKFILL_MS = Number(process.env.WORKER_EMBED_BACKFILL_MS ?? 600_000);
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small";
const EMBED_BATCH = 50;

async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !texts.length) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    });
    if (!res.ok) {
      console.error(`[embed] OpenAI HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      data?: { embedding: number[]; index: number }[];
    };
    const rows = data.data ?? [];
    if (rows.length !== texts.length) return null;
    const out: number[][] = new Array(texts.length);
    for (const r of rows) out[r.index] = r.embedding;
    return out.every(Boolean) ? out : null;
  } catch (e) {
    console.error("[embed] falhou:", e);
    return null;
  }
}

async function embeddingBackfillTick(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) return;
  const { data, error } = await sb
    .from("document_chunks")
    .select("id, content")
    .is("embedding", null)
    .limit(EMBED_BATCH);
  if (error || !data || !data.length) return;
  const vectors = await embedTexts(data.map((r: any) => String(r.content ?? "")));
  if (!vectors) return;
  let done = 0;
  for (let i = 0; i < data.length; i++) {
    // Write as a pgvector literal ("[..]") so the vector column casts cleanly.
    const { error: upErr } = await sb
      .from("document_chunks")
      .update({ embedding: `[${vectors[i].join(",")}]` })
      .eq("id", (data[i] as any).id);
    if (!upErr) done++;
  }
  if (done) console.log(`[embed] backfill: ${done} chunk(s) indexado(s).`);
}

async function embeddingBackfillLoop(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.log("[embed] OPENAI_API_KEY em falta — backfill de embeddings inactivo.");
    return;
  }
  console.log(`[embed] backfill de embeddings a cada ${EMBED_BACKFILL_MS} ms.`);
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    try {
      await embeddingBackfillTick();
    } catch (e) {
      console.error("[embed] tick falhou:", e);
    }
    await sleep(EMBED_BACKFILL_MS);
  }
}

async function main(): Promise<void> {
  console.log(`[worker] iniciado — poll a cada ${POLL_MS} ms.`);
  // Context agent, minions and the Telegram bot run in parallel with jobs.
  void contextAgentLoop();
  void minionLoop();
  void telegramLoop();
  void telegramNotifyLoop();
  void telegramBriefingLoop();
  void markitdownKeepAliveLoop();
  void embeddingBackfillLoop();
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
