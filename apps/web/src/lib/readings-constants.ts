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

export const READING_STATUSES = [
  "Por ler",
  "Em leitura",
  "Usado",
  "Arquivado",
] as const;

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
  createdAt: string;
  updatedAt: string;
}
