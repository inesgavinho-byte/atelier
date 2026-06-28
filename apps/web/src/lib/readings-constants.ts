/**
 * ATELIER — Reading inbox constants & types (client-safe).
 *
 * No `server-only`, no `process.env`, no Supabase — safe to import from client
 * components. The data access lives in `readings.ts` (server-only) and
 * re-exports these.
 */

export const READING_TAGS = [
  "Fonte",
  "Referência",
  "Inspiração",
  "A Rever",
  "Para PAPERS",
  "Para GAVINHO",
  "Para DECIMA",
  "Para NUDO",
] as const;

// Instapaper-style three-state reading flow. "Por ler" is preserved from the
// previous model (the Home inbox counts it and AI-sourced readings default to
// it); "Em leitura"/"Usado"/"Arquivado" were retired.
export const READING_STATUSES = ["Por ler", "A ler", "Lido"] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number];

export interface Reading {
  id: string;
  /** Optional — a reading saved from an AI response has no source URL. */
  url?: string;
  title?: string;
  note?: string;
  workspaceId?: string;
  tags: string[];
  status: string;
  sourceType?: string;
  usedInArtifactId?: string;
  /** Clean reader-mode HTML extracted with Readability (sanitised). */
  content?: string;
  /** Short summary — og:description or the first lines of the article. */
  excerpt?: string;
  /** og:image of the source page, if any. */
  thumbnail?: string;
  /** Estimated reading time in minutes (word count / 200 wpm). */
  readTimeMinutes?: number;
  author?: string;
  /** Publication / site name (og:site_name or the domain). */
  siteName?: string;
  createdAt: string;
  updatedAt: string;
}
