import "server-only";
import { getSupabase } from "@/lib/supabase";
import { gateway } from "@/lib/ai/gateway";

/**
 * Living Artifacts (Sprint 3). An artifact carries canonical `content` and a
 * `revision` number; every revision — including the current one — is a row in
 * artifact_revisions, so the history is a complete timeline (number, summary of
 * what changed, author, date). artifacts.content/revision is the denormalised
 * "latest" for cheap reads.
 */

export interface ArtifactRevision {
  id: string;
  revision: number;
  content: string;
  summary: string;
  createdBy: string;
  createdAt: string;
}

export interface ArtifactDetail {
  id: string;
  title: string;
  kind: string;
  state: string;
  content: string;
  revision: number;
  updatedAt: string;
  revisions: ArtifactRevision[];
}

export async function getArtifactDetail(
  id: string
): Promise<ArtifactDetail | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("artifacts")
    .select("id, title, kind, state, content, revision, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { data: revs } = await sb
    .from("artifact_revisions")
    .select("id, revision, content, summary, created_by, created_at")
    .eq("artifact_id", id)
    .order("revision", { ascending: false });
  return {
    id: data.id,
    title: data.title,
    kind: data.kind,
    state: data.state,
    content: data.content ?? "",
    revision: data.revision ?? 1,
    updatedAt: data.updated_at,
    revisions: (revs ?? []).map((r: any) => ({
      id: r.id,
      revision: r.revision,
      content: r.content ?? "",
      summary: r.summary ?? "",
      createdBy: r.created_by ?? "",
      createdAt: r.created_at,
    })),
  };
}

/**
 * One-sentence summary of what changed between two revisions, via Claude Haiku.
 * Best-effort: returns "" when the provider is unavailable or errors, so a save
 * never fails just because the summary couldn't be generated.
 */
export async function summariseArtifactChange(
  prev: string,
  next: string
): Promise<string> {
  // Nothing meaningful to compare (creation or empty diff).
  if (!prev.trim()) return "Revisão inicial";
  try {
    if (!gateway.get("claude")?.available()) return "";
    const res = await gateway.run({
      provider: "claude",
      model: "claude-haiku-4-5-20251001",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Resume numa única frase curta, em português europeu, o que mudou " +
            "entre duas versões de um documento. Foca o essencial (secções " +
            "adicionadas/removidas/reescritas). Sem preâmbulo, sem aspas. " +
            "Exemplo: “Adicionada secção de orçamento; removida referência ao cliente X.”",
        },
        {
          role: "user",
          content: `VERSÃO ANTERIOR:\n${prev.slice(0, 6000)}\n\nVERSÃO NOVA:\n${next.slice(0, 6000)}`,
        },
      ],
    });
    const text = (res.ok ? res.text ?? "" : "").trim().replace(/^["“]|["”]$/g, "");
    return text.slice(0, 280);
  } catch {
    return "";
  }
}
