"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";
import {
  extractContext,
  toTranscript,
  IMPORT_SOURCES,
  type ExtractedContext,
  type ImportSource,
} from "@/lib/context-import";

export interface ImportResult {
  ok: boolean;
  message: string;
  decisions?: number;
  artifacts?: number;
  lessons?: number;
}

/** Append unique strings (case-insensitive) onto an existing list. */
function mergeList(existing: unknown[], incoming: string[]): string[] {
  const out = existing.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  const seen = new Set(out.map((x) => x.toLowerCase()));
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/**
 * Merge an extraction into a workspace's compressed memory (workspace_context).
 * Appends to the existing lists/summary — never replaces — and bumps the
 * version. Written via the service role (the table is RLS-locked).
 */
async function mergeIntoContext(
  admin: ReturnType<typeof getSupabaseAdmin>,
  workspaceId: string,
  extracted: ExtractedContext
): Promise<void> {
  if (!admin) return;
  const { data: existing } = await admin
    .from("workspace_context")
    .select("summary, decisions, artifacts, lessons, version")
    .eq("workspace_id", workspaceId)
    .is("project_id", null)
    .maybeSingle();

  const summaryParts = [
    (existing?.summary ?? "").trim(),
    extracted.summary.trim(),
  ].filter(Boolean);

  await admin.from("workspace_context").upsert(
    {
      workspace_id: workspaceId,
      project_id: null,
      summary: summaryParts.join("\n\n"),
      decisions: mergeList(existing?.decisions ?? [], extracted.decisions),
      artifacts: mergeList(existing?.artifacts ?? [], extracted.artifacts),
      lessons: mergeList(existing?.lessons ?? [], extracted.lessons),
      version: (existing?.version ?? 0) + 1,
      last_updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,project_id" }
  );
}

/**
 * Import a conversation into a workspace. Stores the raw content in
 * context_imports, runs the Council (Claude Haiku) to extract decisions /
 * artifacts / lessons / summary, and merges the result into workspace_context.
 */
export async function importContext(input: {
  workspaceId: string;
  source: string;
  content: string;
  kind: "text" | "json";
}): Promise<ImportResult> {
  const { workspaceId } = input;
  const source = (IMPORT_SOURCES as readonly string[]).includes(input.source)
    ? (input.source as ImportSource)
    : "other";

  const transcript = toTranscript(input.content, input.kind);
  if (!transcript) {
    return {
      ok: false,
      message:
        input.kind === "json"
          ? "JSON não reconhecido — exporta a conversa de Claude.ai ou ChatGPT."
          : "Cola o texto da conversa primeiro.",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      message:
        "Importação indisponível: falta SUPABASE_SERVICE_ROLE_KEY no ambiente.",
    };
  }

  await hydrateCredentialOverrides();
  const extracted = await extractContext(transcript);

  // Always store the raw import; mark processed only when extraction succeeded.
  const { error: insErr } = await admin.from("context_imports").insert({
    workspace_id: workspaceId,
    source,
    raw_content: transcript,
    processed: Boolean(extracted),
    extracted: extracted ?? {},
  });
  if (insErr) return { ok: false, message: `Falha ao guardar: ${insErr.message}` };

  if (!extracted) {
    return {
      ok: true,
      message:
        "Importado, mas não processado — nenhum provider de IA disponível. Configura uma chave em Ecossistema.",
    };
  }

  await mergeIntoContext(admin, workspaceId, extracted);
  revalidatePath(`/workspaces/${workspaceId}`);

  return {
    ok: true,
    message: `Importado — ${extracted.decisions.length} decisões, ${extracted.artifacts.length} artefactos extraídos.`,
    decisions: extracted.decisions.length,
    artifacts: extracted.artifacts.length,
    lessons: extracted.lessons.length,
  };
}
