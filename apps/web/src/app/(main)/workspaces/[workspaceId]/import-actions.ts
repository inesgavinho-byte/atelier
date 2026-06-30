"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";
import {
  extractContextDetailed,
  toTranscript,
  IMPORT_SOURCES,
  type ImportSource,
} from "@/lib/context-import";
import { mergeWorkspaceContext } from "@/lib/context-merge";
import { recordTimelineEvent } from "@/lib/timeline";

export interface ImportResult {
  ok: boolean;
  message: string;
  decisions?: number;
  artifacts?: number;
  lessons?: number;
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
  /** Target a specific project's memory; omit/null for the workspace. */
  projectId?: string | null;
}): Promise<ImportResult> {
  const { workspaceId } = input;
  const projectId = input.projectId || null;
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

  // Idempotência (4c): conteúdo idêntico (mesma fonte + transcript) → mesmo
  // external_id. Se já foi importado para este workspace, não reprocessa nem
  // duplica (poupa a chamada ao Haiku).
  const externalId = createHash("sha256")
    .update(`${source}:${transcript}`)
    .digest("hex");
  const { data: dup } = await admin
    .from("context_imports")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("external_id", externalId)
    .maybeSingle();
  if (dup) {
    return { ok: true, message: "Já importado (conteúdo idêntico) — ignorado." };
  }

  await hydrateCredentialOverrides();
  const outcome = await extractContextDetailed(transcript);
  const extracted = outcome.ok ? outcome.data : null;

  // Always store the raw import; mark processed only when extraction succeeded.
  const { error: insErr } = await admin.from("context_imports").insert({
    workspace_id: workspaceId,
    source,
    raw_content: transcript,
    external_id: externalId,
    processed: Boolean(extracted),
    extracted: extracted ?? {},
  });
  if (insErr) return { ok: false, message: `Falha ao guardar: ${insErr.message}` };

  if (!extracted) {
    // Surface the real reason (no provider vs. provider call failed) instead of
    // a blanket message, so the fix is obvious.
    return {
      ok: true,
      message: `Importado, mas não processado — ${outcome.ok ? "sem dados" : outcome.reason}`,
    };
  }

  await mergeWorkspaceContext(workspaceId, extracted, projectId);
  await recordTimelineEvent({
    workspaceId,
    projectId,
    kind: "import",
    title: `Contexto importado de ${source}`,
    body: `${extracted.decisions.length} decisões · ${extracted.artifacts.length} artefactos`,
    actor: "user",
  }).catch(() => {});
  revalidatePath(`/workspaces/${workspaceId}`);
  if (projectId)
    revalidatePath(`/workspaces/${workspaceId}/projects/${projectId}`);

  return {
    ok: true,
    message: `Importado — ${extracted.decisions.length} decisões, ${extracted.artifacts.length} artefactos extraídos.`,
    decisions: extracted.decisions.length,
    artifacts: extracted.artifacts.length,
    lessons: extracted.lessons.length,
  };
}
