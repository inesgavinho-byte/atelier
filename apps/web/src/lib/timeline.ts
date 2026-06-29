import "server-only";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * ATELIER — Timeline (ADR-0005 Fatia 2).
 *
 * A unified chronological view of everything that happened in a workspace. It
 * reads the dedicated `timeline_events` log PLUS the existing domain tables
 * (decisions, artifacts, readings, activity, chat) so the Timeline is useful
 * immediately, before every write path is instrumented. Read-only.
 */

export type TimelineKind =
  | "chat"
  | "reading"
  | "capture"
  | "decision"
  | "artifact"
  | "document"
  | "import"
  | "commit"
  | "pr"
  | "deploy"
  | "session_start"
  | "session_end"
  | "note"
  | "activity";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  title: string;
  body?: string | null;
  actor?: string | null;
  at: string;
}

const snippet = (s: string, n = 100) => {
  const line = (s ?? "").trim().split("\n")[0];
  return line.length > n ? `${line.slice(0, n)}…` : line;
};

/**
 * Build the workspace timeline, newest first. Each source is capped so a busy
 * workspace stays responsive; `limit` caps the merged result.
 */
export async function getWorkspaceTimeline(
  workspaceId: string,
  limit = 200
): Promise<TimelineEvent[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const events: TimelineEvent[] = [];

  const [decisions, artifacts, readings, activity, chats, admin] =
    await Promise.all([
      sb
        .from("decisions")
        .select("id, title, status, updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(100),
      sb
        .from("artifacts")
        .select("id, title, kind, updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(100),
      sb
        .from("readings")
        .select("id, title, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100),
      sb
        .from("activity")
        .select("id, kind, title, at")
        .eq("workspace_id", workspaceId)
        .order("at", { ascending: false })
        .limit(100),
      sb
        .from("workspace_chats")
        .select("id")
        .eq("workspace_id", workspaceId),
      Promise.resolve(getSupabaseAdmin()),
    ]);

  for (const d of decisions.data ?? [])
    events.push({
      id: `dec-${d.id}`,
      kind: "decision",
      title: d.title,
      body: `Estado: ${d.status}`,
      actor: "council",
      at: d.updated_at,
    });

  for (const a of artifacts.data ?? [])
    events.push({
      id: `art-${a.id}`,
      kind: "artifact",
      title: a.title,
      body: a.kind,
      actor: "council",
      at: a.updated_at,
    });

  for (const r of readings.data ?? [])
    events.push({
      id: `read-${r.id}`,
      kind: "reading",
      title: r.title ?? "(leitura sem título)",
      actor: "user",
      at: r.created_at,
    });

  for (const ev of activity.data ?? [])
    events.push({
      id: `act-${ev.id}`,
      kind: "activity",
      title: ev.title,
      body: ev.kind,
      actor: "system",
      at: ev.at,
    });

  // Chat messages (recent), via the workspace's chats.
  const chatIds = (chats.data ?? []).map((c) => c.id);
  if (chatIds.length) {
    const { data: msgs } = await sb
      .from("workspace_messages")
      .select("id, role, content, created_at")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false })
      .limit(100);
    for (const m of msgs ?? [])
      events.push({
        id: `msg-${m.id}`,
        kind: "chat",
        title: `${m.role === "assistant" ? "Council" : "Inês"}: ${snippet(m.content)}`,
        actor: m.role === "assistant" ? "council" : "user",
        at: m.created_at,
      });
  }

  // Dedicated timeline_events (RLS-locked → service role).
  if (admin) {
    const { data: te } = await admin
      .from("timeline_events")
      .select("id, kind, title, body, actor, at")
      .eq("workspace_id", workspaceId)
      .order("at", { ascending: false })
      .limit(200);
    for (const e of te ?? [])
      events.push({
        id: `tl-${e.id}`,
        kind: (e.kind as TimelineKind) ?? "note",
        title: e.title,
        body: e.body,
        actor: e.actor,
        at: e.at,
      });
  }

  return events
    .filter((e) => e.at)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, limit);
}

/** Append an explicit event to the dedicated log (best-effort, service role). */
export async function recordTimelineEvent(input: {
  workspaceId: string;
  projectId?: string | null;
  kind: TimelineKind;
  title: string;
  body?: string;
  actor?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("timeline_events").insert({
    workspace_id: input.workspaceId,
    project_id: input.projectId ?? null,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    actor: input.actor ?? null,
    external_id: input.externalId ?? null,
    metadata: input.metadata ?? {},
  });
}

/**
 * Sync a workspace's GitHub activity into the timeline (commits + PRs). The
 * repo overview is re-fetched on each view, so events are upserted by a stable
 * external_id (pr-<n>, commit-<sha>) and duplicates are ignored — calling this
 * repeatedly is safe and cheap. Deploys await a Netlify deploys feed; the
 * 'deploy' kind is already wired in the view. Best-effort, service role.
 */
export async function syncRepoTimeline(
  workspaceId: string,
  overview: {
    prs?: { number: number; title: string; author?: string; createdAt?: string }[];
    commits?: { sha: string; message: string; author?: string; date?: string }[];
  } | null
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin || !overview) return;

  const rows: Record<string, unknown>[] = [];
  for (const pr of overview.prs ?? [])
    rows.push({
      workspace_id: workspaceId,
      kind: "pr",
      external_id: `pr-${pr.number}`,
      title: `PR #${pr.number} — ${pr.title}`,
      actor: pr.author ?? "github",
      at: pr.createdAt ?? undefined,
    });
  for (const c of overview.commits ?? [])
    rows.push({
      workspace_id: workspaceId,
      kind: "commit",
      external_id: `commit-${c.sha}`,
      title: snippet(c.message, 100),
      body: c.sha,
      actor: c.author ?? "github",
      at: c.date ?? undefined,
    });
  if (!rows.length) return;

  // Idempotent: the unique (workspace_id, kind, external_id) index makes
  // re-runs no-ops for events already recorded.
  await admin
    .from("timeline_events")
    .upsert(rows, {
      onConflict: "workspace_id,kind,external_id",
      ignoreDuplicates: true,
    })
    .select("id");
}
