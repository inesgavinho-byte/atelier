import { NextResponse, type NextRequest } from "next/server";
import { requestAuthed } from "@/lib/request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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
  if (!batchId) {
    return NextResponse.json({ error: "Não foi possível guardar o lote." }, { status: 500 });
  }

  const preview = await getBatchPreview(batchId);
  if (!preview) {
    return NextResponse.json({ error: "Não foi possível ler o lote." }, { status: 500 });
  }
  // Carry the upload-level truncation flag onto the preview.
  return NextResponse.json({ ...preview, truncated: parsed.truncated });
}
