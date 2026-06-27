import "server-only";
import {
  CONNECTORS,
  getConnectorDef,
  type ConnectorDef,
  type ConnectorStatus,
  type ConnectorView,
} from "@/lib/connectors";
import { checkDatabase } from "@/lib/diagnostics";
import { gateway } from "@/lib/ai/gateway";
import type { ProviderId } from "@/lib/ai/types";
import { errMessage, fetchWithTimeout } from "@/lib/ai/providers/http";

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

/**
 * AI provider test — runs a minimal request through the gateway. ATELIER never
 * calls the vendor API here directly; it verifies via the same gateway the
 * chats use, so there is no duplicated provider logic.
 */
async function testGatewayProvider(
  id: ProviderId
): Promise<{ ok: boolean; message: string }> {
  const r = await gateway.run({
    provider: id,
    messages: [{ role: "user", content: "ping" }],
    maxTokens: 1,
  });
  if (r.ok) {
    return {
      ok: true,
      message: `Ligação OK — ${r.model} (${r.latencyMs} ms).`,
    };
  }
  return { ok: false, message: r.error ?? "Falha desconhecida." };
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
  openai: () => testGatewayProvider("openai"),
  claude: () => testGatewayProvider("claude"),
  perplexity: () => testGatewayProvider("perplexity"),
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
