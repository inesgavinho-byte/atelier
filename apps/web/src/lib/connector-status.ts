import "server-only";
import {
  CONNECTORS,
  getConnectorDef,
  type ConnectorDef,
  type ConnectorStatus,
  type ConnectorView,
} from "@/lib/connectors";
import { checkDatabase } from "@/lib/diagnostics";

/**
 * ATELIER — connector status & live tests (server-side only).
 *
 * Reads `process.env` to determine credential presence (booleans only — never
 * returns a secret) and performs contained live "test connection" calls. Every
 * test is wrapped so one failing integration never crashes the page.
 */

/** Env aliases: some connectors accept more than one variable name. */
const ENV_ALIASES: Record<string, string[]> = {
  ANTHROPIC_API_KEY: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"],
  NEXT_PUBLIC_SUPABASE_URL: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  ],
};

function envPresent(name: string): boolean {
  const names = ENV_ALIASES[name] ?? [name];
  return names.some((n) => Boolean(process.env[n]));
}

function envList(def: ConnectorDef) {
  const required = def.envRequired.map((name) => ({
    name,
    present: envPresent(name),
    required: true,
  }));
  const optional = (def.envOptional ?? []).map((name) => ({
    name,
    present: envPresent(name),
    required: false,
  }));
  return [...required, ...optional];
}

/** Credential-based status before any live test. */
function computeStatus(def: ConnectorDef): ConnectorStatus {
  const missing = def.envRequired.some((name) => !envPresent(name));
  return missing ? "Credenciais em falta" : "Ligado";
}

function nowLabel(): string {
  try {
    return new Date().toLocaleString("pt-PT");
  } catch {
    return new Date().toISOString();
  }
}

/** Build the credential-based view of every connector (no network calls). */
export function getConnectorViews(): ConnectorView[] {
  return CONNECTORS.map((def) => ({
    ...def,
    status: computeStatus(def),
    env: envList(def),
  }));
}

export function getConnectorView(id: string): ConnectorView | undefined {
  const def = getConnectorDef(id);
  if (!def) return undefined;
  return { ...def, status: computeStatus(def), env: envList(def) };
}

/* ── Live tests ───────────────────────────────────────────────────────────── */

export interface TestOutcome {
  status: ConnectorStatus;
  message: string;
  lastChecked: string;
}

const env = (name: string): string | undefined => {
  const names = ENV_ALIASES[name] ?? [name];
  for (const n of names) if (process.env[n]) return process.env[n];
  return undefined;
};

/** fetch with a hard timeout so a hung endpoint never blocks the action. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms = 9000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function errMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "AbortError") return "Tempo limite excedido.";
    return e.message;
  }
  return String(e);
}

async function testOpenAI(): Promise<{ ok: boolean; message: string }> {
  const key = env("OPENAI_API_KEY");
  if (!key) return { ok: false, message: "OPENAI_API_KEY em falta." };
  const res = await fetchWithTimeout("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { data?: unknown[] }
      | null;
    const n = Array.isArray(data?.data) ? data!.data!.length : 0;
    return { ok: true, message: `Ligação OK — ${n} modelos disponíveis.` };
  }
  return { ok: false, message: `HTTP ${res.status} ${res.statusText}.` };
}

async function testClaude(): Promise<{ ok: boolean; message: string }> {
  const key = env("ANTHROPIC_API_KEY");
  if (!key) return { ok: false, message: "ANTHROPIC_API_KEY em falta." };
  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  if (res.ok) return { ok: true, message: "Ligação OK — resposta recebida." };
  // 400 from a minimal body still proves the key authenticated.
  if (res.status === 400)
    return { ok: true, message: "Chave válida (pedido mínimo aceite)." };
  return { ok: false, message: `HTTP ${res.status} ${res.statusText}.` };
}

async function testPerplexity(): Promise<{ ok: boolean; message: string }> {
  const key = env("PERPLEXITY_API_KEY");
  if (!key) return { ok: false, message: "PERPLEXITY_API_KEY em falta." };
  const res = await fetchWithTimeout(
    "https://api.perplexity.ai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    }
  );
  if (res.ok) return { ok: true, message: "Ligação OK — resposta recebida." };
  return { ok: false, message: `HTTP ${res.status} ${res.statusText}.` };
}

async function testGitHub(): Promise<{ ok: boolean; message: string }> {
  const token = env("GITHUB_TOKEN");
  if (!token) return { ok: false, message: "GITHUB_TOKEN em falta." };
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "atelier-ecosystem",
  };
  const repo = env("GITHUB_REPO");
  if (repo) {
    const res = await fetchWithTimeout(
      `https://api.github.com/repos/${repo}`,
      { headers }
    );
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { full_name?: string }
        | null;
      return { ok: true, message: `Acesso OK — ${data?.full_name ?? repo}.` };
    }
    return { ok: false, message: `HTTP ${res.status} (repo ${repo}).` };
  }
  const res = await fetchWithTimeout("https://api.github.com/user", { headers });
  if (res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { login?: string }
      | null;
    return { ok: true, message: `Token válido — ${data?.login ?? "utilizador"}.` };
  }
  return { ok: false, message: `HTTP ${res.status} ${res.statusText}.` };
}

async function testNetlify(): Promise<{ ok: boolean; message: string }> {
  const token = env("NETLIFY_AUTH_TOKEN");
  const site = env("NETLIFY_SITE_ID");
  if (!token || !site)
    return {
      ok: false,
      message: "NETLIFY_AUTH_TOKEN ou NETLIFY_SITE_ID em falta.",
    };
  const res = await fetchWithTimeout(
    `https://api.netlify.com/api/v1/sites/${site}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { state?: string; published_deploy?: { published_at?: string } }
      | null;
    const state = data?.state ?? "—";
    const last = data?.published_deploy?.published_at ?? "—";
    return { ok: true, message: `Site ${state} · último deploy ${last}.` };
  }
  return { ok: false, message: `HTTP ${res.status} ${res.statusText}.` };
}

async function testSupabase(): Promise<{ ok: boolean; message: string }> {
  const report = await checkDatabase();
  if (report.health === "offline") {
    return {
      ok: false,
      message: report.error ?? "Base de dados inacessível.",
    };
  }
  const total = report.counts.reduce((n, c) => n + (c.count ?? 0), 0);
  const latency = report.latencyMs != null ? ` · ${report.latencyMs} ms` : "";
  return {
    ok: true,
    message: `Acessível — ${total} registos em ${report.counts.length} tabelas${latency}.`,
  };
}

const TESTERS: Record<string, () => Promise<{ ok: boolean; message: string }>> = {
  openai: testOpenAI,
  claude: testClaude,
  perplexity: testPerplexity,
  github: testGitHub,
  netlify: testNetlify,
  supabase: testSupabase,
};

/** Run a connector's live test (or report why it cannot be tested). */
export async function testConnectorLive(id: string): Promise<TestOutcome> {
  const def = getConnectorDef(id);
  const lastChecked = nowLabel();
  if (!def) {
    return { status: "Erro", message: "Conector desconhecido.", lastChecked };
  }

  // Credentials missing — surface that before attempting a call.
  const missing = def.envRequired.filter((name) => !envPresent(name));
  if (missing.length) {
    return {
      status: "Credenciais em falta",
      message: `Em falta: ${missing.join(", ")}.`,
      lastChecked,
    };
  }

  const tester = TESTERS[id];
  if (!def.testable || !tester) {
    return {
      status: "Ligado",
      message: "Configurado. Sem teste activo para este conector.",
      lastChecked,
    };
  }

  try {
    const { ok, message } = await tester();
    return { status: ok ? "Ligado" : "Erro", message, lastChecked };
  } catch (e) {
    return { status: "Erro", message: errMessage(e), lastChecked };
  }
}

/** Live OpenAI completion used by the connector test form. */
export async function runOpenAICompletion(
  prompt: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const key = env("OPENAI_API_KEY");
  if (!key) return { ok: false, error: "OPENAI_API_KEY em falta." };
  if (!prompt.trim()) return { ok: false, error: "Prompt vazio." };
  try {
    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
        }),
      },
      30000
    );
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} ${res.statusText}.` };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: "Resposta vazia." };
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}
