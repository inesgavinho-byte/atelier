import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requestAuthed } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/jobs — enqueue a job for the execution worker (ADR-0002).
 *
 * The ATELIER only enqueues; the worker (a separate Railway service) executes.
 * Writes go through the service-role client because `jobs` is RLS-locked to it.
 * Body: { task_id, prompt, step? }.
 */
export async function POST(req: NextRequest) {
  if (!(await requestAuthed(req))) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role indisponível (define SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const b = body as {
    task_id?: unknown;
    prompt?: unknown;
    step?: unknown;
    requires_approval?: unknown;
  };
  const task_id = typeof b.task_id === "string" ? b.task_id.trim() : "";
  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  const step = Number.isInteger(b.step) ? (b.step as number) : 1;
  const requires_approval = b.requires_approval === true;
  if (!task_id || !prompt) {
    return NextResponse.json(
      { error: "task_id e prompt são obrigatórios." },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("jobs")
    .insert({ task_id, prompt, step, status: "queued", requires_approval })
    .select("id, status")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { job_id: data.id, status: data.status },
    { status: 201 }
  );
}
