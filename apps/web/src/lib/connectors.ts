/**
 * ATELIER — Ecosystem connectors (central configuration)
 *
 * One declarative registry of the external tools ATELIER can connect to. This
 * file is intentionally free of secrets and of any `process.env` access, so it
 * is safe to import from client components. Env presence and live testing live
 * in `connector-status.ts` (server-only).
 */

export type ConnectorStatus =
  | "Não ligado"
  | "Ligado"
  | "Erro"
  | "Credenciais em falta"
  | "Requer OAuth"
  | "Em teste";

export type ConnectorCategory =
  | "IA"
  | "Importação"
  | "Comunicação"
  | "Calendário"
  | "Documentos"
  | "Desenvolvimento"
  | "Publicação";

export const CATEGORY_ORDER: ConnectorCategory[] = [
  "IA",
  "Importação",
  "Comunicação",
  "Calendário",
  "Documentos",
  "Desenvolvimento",
  "Publicação",
];

export interface ConnectorDef {
  id: string;
  name: string;
  category: ConnectorCategory;
  /** One-line description shown on the card (Portuguese). */
  description: string;
  /** Env var names this connector needs to be considered configured. */
  envRequired: string[];
  /** Optional env vars (presence shown, not required for status). */
  envOptional?: string[];
  capabilities: string[];
  /** Whether a live "test connection" is implemented server-side. */
  testable: boolean;
  /**
   * Authentication model. "key" connectors are configured with API keys/URLs
   * stored as credentials; "oauth" connectors require an OAuth flow (not yet
   * available) and expose no credential fields. Absent is treated as "key".
   */
  auth?: "key" | "oauth";
  /** When set, the card's primary action navigates here (a tool, not a key). */
  href?: string;
  /** Display-only: where the tool is used (curated). */
  usedIn?: string[];
  /** Display-only: a small contextual metric (mock). */
  metric?: string;
}

/**
 * The connector registry, in the sprint's priority/category order. Capabilities
 * are listed verbatim in Portuguese.
 */
export const CONNECTORS: ConnectorDef[] = [
  /* ── IA ─────────────────────────────────────────────────────────────── */
  {
    id: "openai",
    name: "OpenAI / ChatGPT",
    category: "IA",
    description: "Escrita, raciocínio, análise e geração de conteúdo.",
    envRequired: ["OPENAI_API_KEY"],
    capabilities: [
      "enviar prompt",
      "receber resposta",
      "guardar resposta como captura",
      "associar resposta a iniciativa",
    ],
    testable: true,
  },
  {
    id: "claude",
    name: "Claude",
    category: "IA",
    description: "Análise profunda e documentos extensos.",
    envRequired: ["ANTHROPIC_API_KEY"],
    capabilities: ["enviar prompt", "receber resposta"],
    testable: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    category: "IA",
    description: "Pesquisa com fontes verificáveis.",
    envRequired: ["PERPLEXITY_API_KEY"],
    capabilities: ["pesquisar", "receber resposta com fontes"],
    testable: true,
  },
  {
    id: "groq",
    name: "Groq",
    category: "IA",
    description: "Inferência ultra-rápida — Llama, Mixtral.",
    envRequired: ["GROQ_API_KEY"],
    capabilities: ["enviar prompt", "receber resposta", "resumos rápidos"],
    testable: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    category: "IA",
    description: "Modelos especializados em código.",
    envRequired: ["DEEPSEEK_API_KEY"],
    capabilities: ["enviar prompt", "receber resposta", "raciocínio"],
    testable: true,
  },
  {
    id: "manus",
    name: "Manus",
    category: "IA",
    description: "Agentes autónomos para tarefas.",
    envRequired: ["MANUS_API_KEY"],
    capabilities: ["executar agente", "receber resultado"],
    testable: false,
  },

  /* ── Importação ─────────────────────────────────────────────────────── */
  {
    id: "chat-import",
    name: "Importação de Chats",
    category: "Importação",
    description: "Importa conversas do Claude.ai, ChatGPT e Perplexity em batch.",
    envRequired: [],
    capabilities: [
      "importar exportações (ZIP/JSON)",
      "mapear a workspaces",
      "extrair decisões e artefactos",
    ],
    testable: false,
    href: "/import",
  },

  /* ── Comunicação ────────────────────────────────────────────────────── */
  {
    id: "gmail",
    name: "Gmail",
    category: "Comunicação",
    description: "Email e pesquisa inteligente na caixa de entrada.",
    envRequired: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"],
    capabilities: [
      "ler emails",
      "pesquisar emails",
      "guardar email como captura",
      "associar email a iniciativa",
      "transformar email em decisão",
    ],
    testable: false,
    auth: "oauth",
  },
  {
    id: "outlook-email",
    name: "Outlook Email",
    category: "Comunicação",
    description: "Email e pesquisa na caixa Outlook.",
    envRequired: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    capabilities: [
      "ler emails",
      "pesquisar emails",
      "guardar email como captura",
      "associar email a iniciativa",
      "transformar email em decisão",
    ],
    testable: false,
    auth: "oauth",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    category: "Comunicação",
    description: "Mensagens e canais de equipa.",
    envRequired: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    capabilities: ["ler mensagens", "pesquisar mensagens", "guardar como captura"],
    testable: false,
    auth: "oauth",
  },

  /* ── Calendário ─────────────────────────────────────────────────────── */
  {
    id: "ics-calendar",
    name: "Calendário (ICS)",
    category: "Calendário",
    description: "Agenda por feed ICS — Google, Outlook ou Apple.",
    envRequired: ["ICS_CALENDAR_URL"],
    capabilities: [
      "ler agenda",
      "mostrar reuniões do dia",
      "suportar eventos recorrentes",
    ],
    testable: true,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Calendário",
    description: "Agenda, reuniões e disponibilidade.",
    envRequired: ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET"],
    capabilities: [
      "ler agenda",
      "mostrar reuniões do dia",
      "associar reunião a iniciativa",
      "criar captura a partir de reunião",
    ],
    testable: false,
    auth: "oauth",
  },
  {
    id: "outlook-calendar",
    name: "Outlook Calendar",
    category: "Calendário",
    description: "Agenda e reuniões Outlook.",
    envRequired: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    capabilities: [
      "ler agenda",
      "mostrar reuniões do dia",
      "associar reunião a iniciativa",
      "criar captura a partir de reunião",
    ],
    testable: false,
    auth: "oauth",
  },

  /* ── Documentos ─────────────────────────────────────────────────────── */
  {
    id: "google-drive",
    name: "Google Drive",
    category: "Documentos",
    description: "Documentos, referências e artefactos.",
    envRequired: ["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET"],
    capabilities: [
      "pesquisar documentos",
      "abrir documentos",
      "guardar documento como artefacto",
      "associar documento a iniciativa",
      "indexar conteúdo futuramente",
    ],
    testable: false,
    auth: "oauth",
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    category: "Documentos",
    description: "Documentos e bibliotecas SharePoint.",
    envRequired: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    capabilities: [
      "pesquisar documentos",
      "abrir documentos",
      "guardar documento como artefacto",
      "associar documento a iniciativa",
      "indexar conteúdo futuramente",
    ],
    testable: false,
    auth: "oauth",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    category: "Documentos",
    description: "Ficheiros e documentos OneDrive.",
    envRequired: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    capabilities: [
      "pesquisar documentos",
      "abrir documentos",
      "guardar documento como artefacto",
      "associar documento a iniciativa",
    ],
    testable: false,
    auth: "oauth",
  },

  /* ── Desenvolvimento ────────────────────────────────────────────────── */
  {
    id: "github",
    name: "GitHub",
    category: "Desenvolvimento",
    description: "Código, PRs, commits e issues.",
    envRequired: ["GITHUB_TOKEN"],
    envOptional: ["GITHUB_REPO"],
    capabilities: [
      "ler PRs",
      "ler commits",
      "ler issues",
      "associar PR a iniciativa",
      "mostrar estado de desenvolvimento",
    ],
    testable: true,
  },
  {
    id: "netlify",
    name: "Netlify",
    category: "Desenvolvimento",
    description: "Deploys, estado do site e logs.",
    envRequired: ["NETLIFY_AUTH_TOKEN", "NETLIFY_SITE_ID"],
    capabilities: [
      "ver deploys",
      "ver estado do site",
      "ler logs básicos",
      "mostrar último deploy",
    ],
    testable: true,
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "Desenvolvimento",
    description: "Base de dados e persistência.",
    envRequired: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    envOptional: ["SUPABASE_SERVICE_ROLE_KEY"],
    capabilities: [
      "estado da ligação",
      "base de dados acessível",
      "contagem de registos",
      "última verificação",
    ],
    testable: true,
  },

  /* ── Publicação ─────────────────────────────────────────────────────── */
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "Publicação",
    description: "Publicação e presença profissional.",
    envRequired: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    capabilities: ["publicar", "ler publicações", "associar a iniciativa"],
    testable: false,
    auth: "oauth",
  },
  {
    id: "instagram",
    name: "Instagram",
    category: "Publicação",
    description: "Publicação visual e presença social.",
    envRequired: ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET"],
    capabilities: ["publicar", "ler publicações", "associar a iniciativa"],
    testable: false,
    auth: "oauth",
  },
];

export function getConnectorDef(id: string): ConnectorDef | undefined {
  return CONNECTORS.find((c) => c.id === id);
}

/**
 * Per-env-var input hints (placeholder + one-line helper), keyed by env var
 * name. Kept here so the drawer can render a sensible placeholder/helper for a
 * field without connector-specific branches scattered through the UI.
 */
export interface EnvHint {
  placeholder?: string;
  helper?: string;
}

export const ENV_HINTS: Record<string, EnvHint> = {
  ICS_CALENDAR_URL: {
    placeholder:
      "https://calendar.google.com/calendar/ical/.../basic.ics",
    helper:
      "Encontras este URL em Google Calendar → Definições → Endereço secreto iCal.",
  },
};

export function getEnvHint(envKey: string): EnvHint | undefined {
  return ENV_HINTS[envKey];
}

/** Serializable per-connector state passed to the client. Never holds secrets. */
export interface ConnectorView extends ConnectorDef {
  status: ConnectorStatus;
  /** Presence of each relevant env var — booleans only, never values. */
  env: { name: string; present: boolean; required: boolean }[];
  message?: string;
  lastChecked?: string;
}
