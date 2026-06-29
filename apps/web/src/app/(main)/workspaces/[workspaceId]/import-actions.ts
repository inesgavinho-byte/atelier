"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";
import {
  extractContext,
  toTranscript,
  IMPORT_SOURCES,
  type ImportSource,
} from "@/lib/context-import";
import { mergeWorkspaceContext } from "@/lib/context-merge";

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

  await mergeWorkspaceContext(workspaceId, extracted);
  revalidatePath(`/workspaces/${workspaceId}`);

  return {
    ok: true,
    message: `Importado — ${extracted.decisions.length} decisões, ${extracted.artifacts.length} artefactos extraídos.`,
    decisions: extracted.decisions.length,
    artifacts: extracted.artifacts.length,
    lessons: extracted.lessons.length,
  };
}
