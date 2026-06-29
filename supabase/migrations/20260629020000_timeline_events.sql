-- ADR-0005 Fatia 2 — Timeline. A dedicated, append-only event log per workspace
-- (and optionally per project). The Timeline page reads this PLUS the existing
-- domain tables (decisions, artifacts, readings, activity, chat) so it is useful
-- immediately; new explicit events land here. RLS-locked to the service role,
-- like the other agent-written tables.

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.workspace_projects(id) on delete set null,
  session_id uuid,
  kind text not null,
  -- 'chat' | 'reading' | 'capture' | 'decision' | 'artifact'
  -- | 'commit' | 'pr' | 'deploy' | 'session_start' | 'session_end' | 'note'
  title text not null,
  body text,
  metadata jsonb default '{}',
  actor text, -- 'user' | 'council' | 'agent' | 'github' | 'netlify'
  at timestamptz not null default now()
);

create index if not exists timeline_events_workspace_idx
  on public.timeline_events (workspace_id, at desc);

alter table public.timeline_events enable row level security;
