"use server";

import { getInitiatives } from "@/lib/mission";
import {
  autoMapConversation,
  processConversation,
  type ProcessResult,
} from "@/lib/import-batch";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hydrateCredentialOverrides } from "@/lib/credentials-store";
import { MAX_SELECTED_PER_BATCH } from "@/lib/importers";

/** Max conversations processed in a single importConversations call (the UI
 * chunks a larger selection into successive calls for live progress). */
const CHUNK = 5;

async function loadConv(batchId: string, externalId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("import_batches")
    .select("conversations")
    .eq("id", batchId)
    .maybeSingle();
  const convs = (data?.conversations ?? []) as {
    externalId: string;
    title: string;
    messages: { role: "user" | "assistant"; content: string; at: string }[];
    source: "claude" | "chatgpt" | "perplexity";
    createdAt: string;
    updatedAt: string;
  }[];
  return convs.find((c) => c.externalId === externalId) ?? null;
}

/** Auto-map one conversation to the most relevant workspace (Council). */
export async function autoMapOne(
  batchId: string,
  externalId: string
): Promise<{ workspaceId: string | null; workspaceName: string | null }> {
  await hydrateCredentialOverrides();
  const [conv, workspaces] = await Promise.all([
    loadConv(batchId, externalId),
    getInitiatives(),
  ]);
  if (!conv) return { workspaceId: null, workspaceName: null };
  const options = workspaces.map((w) => ({ id: w.id, name: w.name }));
  const workspaceId = await autoMapConversation(conv, options);
  const workspaceName = workspaces.find((w) => w.id === workspaceId)?.name ?? null;
  return { workspaceId, workspaceName };
}

/**
 * Process a chunk of selected conversations (≤5) concurrently. Each item maps a
 * conversation to a destination workspace. `force` updates an already-imported
 * conversation instead of skipping it.
 */
export async function importConversations(
  batchId: string,
  items: { externalId: string; workspaceId: string }[],
  force = false
): Promise<ProcessResult[]> {
  await hydrateCredentialOverrides();
  const slice = items.slice(0, Math.min(CHUNK, MAX_SELECTED_PER_BATCH));
  return Promise.all(
    slice.map((it) =>
      it.workspaceId
        ? processConversation(batchId, it.externalId, it.workspaceId, force)
        : Promise.resolve<ProcessResult>({
            externalId: it.externalId,
            title: "",
            ok: false,
            message: "Sem workspace destino.",
          })
    )
  );
}
