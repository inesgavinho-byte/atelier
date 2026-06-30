import "server-only";
import { unzipSync } from "fflate";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { gateway } from "@/lib/ai/gateway";
import { extractContext } from "@/lib/context-import";
import { mergeWorkspaceContext } from "@/lib/context-merge";
import {
  clampTranscript,
  transcriptOf,
  parseExport,
  type ConversationImport,
  type ImportSource,
  type ParsedUpload,
} from "@/lib/importers";

/**
 * ATELIER — batch import engine (server-only).
 *
 * Turns an uploaded export (ZIP or JSON) into a stored "import batch" of
 * normalised conversations, builds the preview (with dedup flags), auto-maps a
 * conversation to a workspace via the Council, and processes a selection:
 * extract → store context_import → merge into workspace_context. Files are only
 * ever handled here, on the server.
 */

export interface ConversationPreview {
  externalId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  /** Already imported before (same source + externalId). */
  duplicate: boolean;
}

export interface BatchPreview {
  batchId: string;
  source: ImportSource;
  truncated: boolean;
  conversations: ConversationPreview[];
}

export interface ProcessResult {
  externalId: string;
  title: string;
  ok: boolean;
  skipped?: boolean;
  truncated?: boolean;
  decisions?: number;
  artifacts?: number;
  workspaceId?: string;
  message?: string;
}

/* ── Upload → parsed conversations ────────────────────────────────────────── */

function isZip(filename: string, bytes: Uint8Array): boolean {
  if (/\.zip$/i.test(filename)) return true;
  return bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
}

/** Extract the export JSON from an uploaded ZIP or raw JSON file. */
export function jsonFromUpload(filename: string, bytes: Uint8Array): unknown {
  let text: string;
  if (isZip(filename, bytes)) {
    const files = unzipSync(bytes);
    const names = Object.keys(files);
    const pick =
      names.find((n) => /conversations\.json$/i.test(n)) ??
      names.find((n) => /\.json$/i.test(n));
    if (!pick) throw new Error("O ZIP não contém conversations.json.");
    text = new TextDecoder().decode(files[pick]);
  } else {
    text = new TextDecoder().decode(bytes);
  }
  return JSON.parse(text);
}

/** Parse an upload's bytes into normalised conversations (or null). */
export function parseUpload(filename: string, bytes: Uint8Array): ParsedUpload | null {
  return parseExport(jsonFromUpload(filename, bytes));
}

/* ── Batch persistence + preview ──────────────────────────────────────────── */

/** Store a parsed batch and return its id. Throws with the DB error on failure
 *  so the caller can surface a real message instead of an opaque 500. */
export async function storeBatch(parsed: ParsedUpload): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Service role indisponível.");
  const { data, error } = await admin
    .from("import_batches")
    .insert({ source: parsed.source, conversations: parsed.conversations })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao guardar o lote (import_batches): ${error.message}`);
  return data.id as string;
}

async function loadBatch(
  batchId: string
): Promise<{ source: ImportSource; conversations: ConversationImport[] } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("import_batches")
    .select("source, conversations")
    .eq("id", batchId)
    .maybeSingle();
  if (!data) return null;
  return {
    source: data.source as ImportSource,
    conversations: (data.conversations ?? []) as ConversationImport[],
  };
}

/** Which externalIds of a source were already imported. */
async function existingExternalIds(
  source: ImportSource,
  ids: string[]
): Promise<Set<string>> {
  const admin = getSupabaseAdmin();
  if (!admin || !ids.length) return new Set();
  const { data } = await admin
    .from("context_imports")
    .select("external_id")
    .eq("source", source)
    .in("external_id", ids);
  return new Set((data ?? []).map((r) => r.external_id as string));
}

/** Build the preview for a stored batch (with dedup flags). */
export async function getBatchPreview(batchId: string): Promise<BatchPreview | null> {
  const batch = await loadBatch(batchId);
  if (!batch) return null;
  const ids = batch.conversations.map((c) => c.externalId);
  const seen = await existingExternalIds(batch.source, ids);
  return {
    batchId,
    source: batch.source,
    truncated: false,
    conversations: batch.conversations.map((c) => ({
      externalId: c.externalId,
      title: c.title,
      messageCount: c.messages.length,
      createdAt: c.createdAt,
      duplicate: seen.has(c.externalId),
    })),
  };
}

/* ── Auto-map (Council) ───────────────────────────────────────────────────── */

const HAIKU = "claude-haiku-4-5-20251001";

function pickProvider(): { provider: "claude" | "openai" | "perplexity"; model?: string } | null {
  const avail = new Map(gateway.availability().map((a) => [a.id, a.available]));
  if (avail.get("claude")) return { provider: "claude", model: HAIKU };
  if (avail.get("openai")) return { provider: "openai" };
  if (avail.get("perplexity")) return { provider: "perplexity" };
  return null;
}

/**
 * Ask the Council which workspace a conversation belongs to. Returns the
 * matched workspace id, or null ("Sem workspace" / no provider / no match).
 */
export async function autoMapConversation(
  conv: ConversationImport,
  workspaces: { id: string; name: string }[]
): Promise<string | null> {
  if (!workspaces.length) return null;
  const choice = pickProvider();
  if (!choice) return null;

  const firstMessages = conv.messages
    .slice(0, 3)
    .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
    .join("\n");
  const names = workspaces.map((w) => w.name).join(", ");

  const r = await gateway.run({
    provider: choice.provider,
    model: choice.model,
    maxTokens: 32,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Mapeia uma conversa para o workspace mais relevante. Responde APENAS com o nome exacto de um dos workspaces, ou 'Sem workspace'. Sem mais texto.",
      },
      {
        role: "user",
        content: `Workspaces: ${names}\n\nTítulo: ${conv.title}\n\nMensagens:\n${firstMessages}`,
      },
    ],
  });
  if (!r.ok || !r.text) return null;

  const answer = r.text.trim().toLowerCase();
  const match = workspaces.find(
    (w) => answer === w.name.toLowerCase() || answer.includes(w.name.toLowerCase())
  );
  return match?.id ?? null;
}

/* ── Process one conversation ─────────────────────────────────────────────── */

export async function processConversation(
  batchId: string,
  externalId: string,
  workspaceId: string,
  force = false
): Promise<ProcessResult> {
  const admin = getSupabaseAdmin();
  const batch = await loadBatch(batchId);
  const conv = batch?.conversations.find((c) => c.externalId === externalId);
  if (!admin || !conv) {
    return { externalId, title: "", ok: false, message: "Conversa não encontrada." };
  }

  // Dedup unless the user chose to update.
  if (!force) {
    const seen = await existingExternalIds(conv.source, [externalId]);
    if (seen.has(externalId)) {
      return { externalId, title: conv.title, ok: true, skipped: true };
    }
  }

  const { text, truncated } = clampTranscript(transcriptOf(conv));
  const extracted = await extractContext(text);

  const { error } = await admin.from("context_imports").insert({
    workspace_id: workspaceId,
    source: conv.source,
    external_id: externalId,
    raw_content: text,
    processed: Boolean(extracted),
    extracted: extracted ?? {},
  });
  if (error) {
    return { externalId, title: conv.title, ok: false, message: error.message };
  }

  if (extracted) await mergeWorkspaceContext(workspaceId, extracted);

  return {
    externalId,
    title: conv.title,
    ok: true,
    truncated,
    workspaceId,
    decisions: extracted?.decisions.length ?? 0,
    artifacts: extracted?.artifacts.length ?? 0,
  };
}
