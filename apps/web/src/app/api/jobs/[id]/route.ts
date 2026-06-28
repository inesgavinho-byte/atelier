import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requestAuthed } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/[id] — current state of a single job, for browser polling.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { data, error } = await admin
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }

  return NextResponse.json(data);
}
