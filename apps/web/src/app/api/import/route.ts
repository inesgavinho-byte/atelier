import { NextResponse, type NextRequest } from "next/server";
import { requestAuthed } from "@/lib/request-auth";
import { getSupabaseAdmin, serviceRoleStatus } from "@/lib/supabase-admin";
import { parseUpload, storeBatch, getBatchPreview } from "@/lib/import-batch";

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
    const preview = await getBatchPreview(batchId);
    if (!preview) {
      return NextResponse.json(
        { error: "Não foi possível ler o lote depois de guardar." },
        { status: 500 }
      );
    }
    // Carry the upload-level truncation flag onto the preview.
    return NextResponse.json({ ...preview, truncated: parsed.truncated });
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
