import { NextResponse, type NextRequest } from "next/server";
import { requestAuthed } from "@/lib/request-auth";
import { getSupabaseAdmin, serviceRoleStatus } from "@/lib/supabase-admin";
import {
  parseUpload,
  storeBatch,
  previewFromConversations,
} from "@/lib/import-batch";

// Netlify's synchronous functions cap the request body (~6 MB) and the run at
// ~10s. Reject clearly above a safe size so the user gets guidance instead of
// an opaque 502.
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/import — upload a Claude.ai / ChatGPT / Perplexity export (ZIP or
 * JSON). The file is parsed server-side into a stored batch; the response is
 * the preview (conversations + dedup flags) for selection/mapping. The file
 * itself never returns to or stays in the browser.
 */
export async function POST(req: NextRequest) {
  if (!(await requestAuthed(req))) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!getSupabaseAdmin()) {
    return NextResponse.json(
      { error: "Importação indisponível: falta SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }
  // import_batches / context_imports are RLS-locked; a non-service-role key
  // (e.g. an anon/publishable key pasted by mistake) silently fails every
  // insert. Catch that here with a clear message instead of an opaque 500.
  const role = serviceRoleStatus();
  if (!role.isServiceRole) {
    return NextResponse.json(
      {
        error:
          role.note ??
          "SUPABASE_SERVICE_ROLE_KEY não é uma service role — a importação não consegue escrever.",
      },
      { status: 503 }
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Upload inválido." }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Nenhum ficheiro enviado." }, { status: 400 });
  }

  // Everything from here can throw (huge body read, ZIP/JSON parse, DB write).
  // Wrap it all so the client always gets a JSON error, never an opaque HTML
  // 500 (which would surface only as a generic "Falha no upload").
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (bytes.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error:
            `Ficheiro demasiado grande (${(bytes.byteLength / 1_048_576).toFixed(1)} MB, ` +
            `máximo ~6 MB). Exporta um intervalo menor ou envia o conversations.json ` +
            `directamente (sem o ZIP inteiro).`,
        },
        { status: 413 }
      );
    }

    let parsed;
    try {
      parsed = parseUpload(file.name, bytes);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Falha ao ler o ficheiro." },
        { status: 400 }
      );
    }
    if (!parsed) {
      return NextResponse.json(
        { error: "Formato não reconhecido (Claude.ai, ChatGPT ou Perplexity)." },
        { status: 422 }
      );
    }

    const batchId = await storeBatch(parsed);
    // Build the preview from the conversations we already have in memory —
    // avoid re-reading the (potentially multi-MB) JSONB we just stored, which
    // doubled the work inside the 10s window.
    const preview = await previewFromConversations(
      batchId,
      parsed.source,
      parsed.conversations,
      parsed.truncated
    );
    return NextResponse.json(preview);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao processar o ficheiro.";
    console.error("[api/import] failed:", message);
    return NextResponse.json(
      {
        error:
          `${message}. Se o export for grande (>~6 MB), exporta um intervalo ` +
          `menor ou envia o conversations.json directamente.`,
      },
      { status: 500 }
    );
  }
}
