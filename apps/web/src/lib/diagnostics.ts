import "server-only";
import { getSupabase } from "@/lib/supabase";
import { getDocs } from "@/lib/atelier-docs";
import { getProductDocs } from "@/lib/product-docs";

/**
 * ATELIER — system diagnostics (server-side).
 *
 * Every check is wrapped so a failure is contained: one integration being down
 * never crashes the page. Nothing here returns a secret — only health, counts,
 * latency and (on failure) the error message.
 */

export type Health = "online" | "warning" | "offline" | "na";

export interface TestResult {
  status: "success" | "warning" | "failure";
  ms: number;
  detail: string;
}

export interface Probe {
  label: string;
  health: Health;
  detail?: string;
  latencyMs?: number;
}

/* ── 4 — Database (live) ──────────────────────────────────────────────────── */

const COUNTED_TABLES = [
  "initiatives",
  "agents",
  "decisions",
  "objectives",
  "artifacts",
  "captures",
  "activity",
] as const;

export interface DatabaseReport {
  health: Health;
  latencyMs?: number;
  error?: string;
  counts: { table: string; count: number | null; error?: string }[];
}

export async function checkDatabase(): Promise<DatabaseReport> {
  const sb = getSupabase();
  if (!sb) {
    return {
      health: "offline",
      error: "Cliente Supabase não inicializado (variáveis de ambiente em falta).",
      counts: [],
    };
  }
  const counts: DatabaseReport["counts"] = [];
  let health: Health = "online";
  let latencyMs: number | undefined;
  let topError: string | undefined;

  // Connection + latency via a minimal select.
  try {
    const t0 = performance.now();
    const { error } = await sb.from("initiatives").select("id").limit(1);
    latencyMs = Math.round(performance.now() - t0);
    if (error) {
      health = "offline";
      topError = `${error.message}${error.code ? ` (code ${error.code})` : ""}`;
    }
  } catch (e) {
    health = "offline";
    topError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // Per-table counts (each isolated).
  for (const table of COUNTED_TABLES) {
    try {
      const { count, error } = await sb
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) {
        counts.push({ table, count: null, error: error.message });
        if (health === "online") health = "warning";
      } else {
        counts.push({ table, count: count ?? 0 });
      }
    } catch (e) {
      counts.push({
        table,
        count: null,
        error: e instanceof Error ? e.message : String(e),
      });
      if (health === "online") health = "warning";
    }
  }

  return { health, latencyMs, error: topError, counts };
}

/* ── 1 — Platform ─────────────────────────────────────────────────────────── */

export async function getPlatform(db: DatabaseReport): Promise<Probe[]> {
  const dbOk = db.health === "online";
  let constitution = 0;
  let product = 0;
  try {
    constitution = getDocs().length;
  } catch {
    /* ignore */
  }
  try {
    product = getProductDocs().length;
  } catch {
    /* ignore */
  }

  return [
    { label: "Frontend", health: "online", detail: "Servido" },
    { label: "Backend (runtime)", health: "online", detail: "Funções server-side ativas" },
    {
      label: "Database",
      health: db.health,
      detail: db.error ?? "Supabase",
      latencyMs: db.latencyMs,
    },
    { label: "Storage", health: "na", detail: "Sem buckets configurados" },
    { label: "Authentication", health: "na", detail: "Não configurado (sem auth)" },
    {
      label: "Search",
      health: dbOk ? "online" : "warning",
      detail: "Pesquisa sobre dados + registos",
    },
    { label: "Memory", health: "na", detail: "Planeado" },
    {
      label: "Knowledge",
      health: "online",
      detail: "Camada de repositório (markdown)",
    },
    {
      label: "Product Library",
      health: product > 0 ? "online" : "warning",
      detail: `${product} documento(s)`,
    },
    {
      label: "Constitution",
      health: constitution > 0 ? "online" : "warning",
      detail: `${constitution} documento(s)`,
    },
  ];
}

/* ── 2 — Integrations ─────────────────────────────────────────────────────── */

export interface IntegrationProbe extends Probe {
  verified: boolean;
}

export async function getIntegrations(
  db: DatabaseReport
): Promise<IntegrationProbe[]> {
  const present = (...names: string[]) =>
    names.some((n) => Boolean(process.env[n]));

  // Config-based health for services we cannot actively probe (no credentials
  // / no health endpoint wired). Only Supabase is actively verified here.
  const configBased = (label: string, ...envs: string[]): IntegrationProbe => ({
    label,
    verified: false,
    health: present(...envs) ? "online" : "na",
    detail: present(...envs) ? "Configurado (sem verificação ativa)" : "Não configurado",
  });

  return [
    {
      label: "Supabase",
      verified: true,
      health: db.health,
      detail: db.error ?? "Verificado por consulta",
      latencyMs: db.latencyMs,
    },
    configBased("Netlify", "NETLIFY", "DEPLOY_ID"),
    configBased("GitHub", "GITHUB_TOKEN"),
    configBased("OpenAI", "OPENAI_API_KEY"),
    configBased("Claude", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY"),
    configBased("Perplexity", "PERPLEXITY_API_KEY"),
    configBased("Manus", "MANUS_API_KEY"),
    configBased("Microsoft 365", "MS365_CLIENT_ID", "MICROSOFT_CLIENT_ID"),
    configBased("Outlook", "OUTLOOK_CLIENT_ID"),
    configBased("Teams", "TEAMS_WEBHOOK_URL"),
    configBased("LinkedIn", "LINKEDIN_CLIENT_ID"),
  ];
}

/* ── 3 — Environment ──────────────────────────────────────────────────────── */

export function getEnvironmentInfo(): { label: string; value: string }[] {
  const context =
    process.env.CONTEXT ?? // Netlify: production | deploy-preview | branch-deploy
    process.env.NODE_ENV ??
    "—";
  return [
    { label: "Ambiente", value: context },
    { label: "Node", value: process.version },
    {
      label: "Build / Deploy ID",
      value: process.env.BUILD_ID ?? process.env.DEPLOY_ID ?? "—",
    },
    {
      label: "Git commit",
      value: (process.env.COMMIT_REF ?? "—").slice(0, 12),
    },
    { label: "Branch", value: process.env.BRANCH ?? process.env.HEAD ?? "—" },
    {
      label: "Deploy URL",
      value: process.env.DEPLOY_PRIME_URL ?? process.env.URL ?? "—",
    },
  ];
}

/* ── 5 — Environment variables (presence only) ────────────────────────────── */

export function getEnvPresence(): { label: string; present: boolean }[] {
  const has = (...names: string[]) => names.some((n) => Boolean(process.env[n]));
  return [
    { label: "NEXT_PUBLIC_SUPABASE_URL", present: has("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL") },
    { label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", present: has("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY") },
    { label: "OPENAI_API_KEY", present: has("OPENAI_API_KEY") },
    { label: "CLAUDE_API_KEY", present: has("CLAUDE_API_KEY", "ANTHROPIC_API_KEY") },
    { label: "PERPLEXITY_API_KEY", present: has("PERPLEXITY_API_KEY") },
    { label: "GITHUB_TOKEN", present: has("GITHUB_TOKEN") },
  ];
}

/* ── 8 — Performance (what is truthfully measurable) ──────────────────────── */

export function getPerformance(db: DatabaseReport): { label: string; value: string }[] {
  const mem = (() => {
    try {
      const m = process.memoryUsage();
      return `${Math.round(m.rss / 1024 / 1024)} MB (RSS)`;
    } catch {
      return "—";
    }
  })();
  return [
    {
      label: "Latência da base de dados",
      value: db.latencyMs != null ? `${db.latencyMs} ms` : "—",
    },
    { label: "Memória do processo", value: mem },
    { label: "Tempo de carregamento (cliente)", value: "— (requer instrumentação)" },
    { label: "Tempo de pesquisa", value: "— (em memória)" },
    { label: "Tamanho do build", value: "— (não disponível em runtime)" },
  ];
}
