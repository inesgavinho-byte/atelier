import "server-only";
import { getWorkspaceTimeline } from "@/lib/timeline";
import type { WorkspaceContext } from "@/lib/workspaces";
import type { Artifact, Decision } from "@/data/mission";
import type { RepoOverview } from "@/lib/github";

/**
 * Mission Engine v1 (Bloco C). Infers a workspace's state from the evidence
 * already on hand — compressed context, decisions, artifacts, documents and
 * the GitHub overview — into a single glanceable summary above the chat:
 * progress, what changed recently, the highest-ROI next step, and a confidence
 * score that reflects how much evidence backs the inference. Fully
 * deterministic (no LLM call) so it is cheap and stable.
 */

export interface MissionChange {
  title: string;
  kind: string;
  at: string;
}

export interface MissionState {
  /** Inferred completion, 0–100. */
  progress: number;
  /** How much evidence backs the inference, 0–100. */
  confidence: number;
  /** Recent timeline events (newest first). */
  changed: MissionChange[];
  /** The single most valuable next move. */
  nextStep: { action: string; why: string } | null;
}

function pickNextStep(s: {
  summary: string;
  pending: Decision[];
  openPRs: number;
  artifacts: number;
  documentCount: number;
  repoConnected: boolean;
}): { action: string; why: string } | null {
  if (s.pending.length)
    return {
      action: `Resolver decisão pendente: ${s.pending[0].title}`,
      why: `${s.pending.length} decisão(ões) à espera de ti.`,
    };
  if (s.openPRs)
    return {
      action: `Rever ${s.openPRs} PR aberto(s)`,
      why: "Há trabalho à espera de revisão no repositório.",
    };
  if (!s.summary)
    return {
      action: "Importar contexto da conversa",
      why: "O workspace ainda não tem memória — importa uma conversa para arrancar.",
    };
  if (s.documentCount === 0)
    return {
      action: "Carregar documentos",
      why: "Sem documentos, o DECIMA não tem material para fundamentar.",
    };
  if (!s.repoConnected)
    return {
      action: "Ligar o repositório GitHub",
      why: "Liga o repo para acompanhar PRs e commits aqui.",
    };
  if (s.artifacts === 0)
    return {
      action: "Guardar o primeiro artefacto",
      why: "Transforma uma resposta útil num artefacto permanente.",
    };
  return {
    action: "Continuar a conversa com o workspace",
    why: "O essencial está montado — avança no trabalho.",
  };
}

export async function getMissionState(input: {
  workspaceId: string;
  context: WorkspaceContext | null;
  decisions: Decision[];
  artifacts: Artifact[];
  documentCount: number;
  repoConnected: boolean;
  overview: RepoOverview | null;
}): Promise<MissionState> {
  const { context, decisions, artifacts, documentCount, repoConnected, overview } =
    input;
  const summary = context?.summary?.trim() ?? "";
  const version = context?.version ?? 0;
  const pending = decisions.filter((d) => d.status === "pendente");
  const resolved = decisions.filter(
    (d) => d.status === "aprovada" || d.status === "rejeitada"
  );
  const openPRs = overview?.prs?.length ?? 0;

  // Progress — a transparent weighted inference from the evidence we have.
  let p = 0;
  if (summary) p += 15;
  p += Math.min(version, 10) * 1.5; // up to 15
  if (decisions.length) p += (resolved.length / decisions.length) * 25;
  p += (Math.min(artifacts.length, 8) / 8) * 25;
  p += (Math.min(documentCount, 6) / 6) * 10;
  if (repoConnected) p += 10;
  const progress = Math.round(Math.min(100, p));

  // Confidence — how many independent evidence sources are present.
  const signals = [
    summary ? 1 : 0,
    version > 0 ? 1 : 0,
    decisions.length > 0 ? 1 : 0,
    artifacts.length > 0 ? 1 : 0,
    documentCount > 0 ? 1 : 0,
    repoConnected ? 1 : 0,
  ];
  const confidence = Math.round(
    (signals.reduce((a, b) => a + b, 0) / signals.length) * 100
  );

  const nextStep = pickNextStep({
    summary,
    pending,
    openPRs,
    artifacts: artifacts.length,
    documentCount,
    repoConnected,
  });

  // What changed — most recent timeline events (best-effort).
  let changed: MissionChange[] = [];
  try {
    const events = await getWorkspaceTimeline(input.workspaceId, 40);
    changed = events.slice(0, 5).map((e) => ({
      title: e.title,
      kind: e.kind,
      at: e.at,
    }));
  } catch {
    /* timeline is best-effort */
  }

  return { progress, confidence, changed, nextStep };
}
