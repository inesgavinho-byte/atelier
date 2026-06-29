-- ADR-0006 — Personal Decimin & Conversation Watch v1.
-- The Telegram bot (ADR-0003) gains its first Personal Decimin capability:
-- observing groups it was explicitly added to, extracting pending items
-- (requests, commitments, promised files, deadlines, unanswered questions) and
-- delivering a daily briefing. Both tables are RLS-locked to the service role,
-- like minions/jobs — the Railway worker writes, the app reads via the admin
-- client.

create table if not exists public.telegram_groups (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint unique not null,
  title text not null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.workspace_projects(id) on delete set null,
  autonomy_level integer not null default 2,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_pending_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.telegram_groups(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  kind text not null,
  -- 'request' | 'commitment' | 'promised_file' | 'deadline'
  -- | 'unanswered_question' | 'decision' | 'risk'
  description text not null,
  from_person text,
  to_person text,
  due_date date,
  status text not null default 'pending', -- 'pending' | 'resolved' | 'dismissed'
  source_message_id bigint,
  source_message_text text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists telegram_pending_items_status_idx
  on public.telegram_pending_items (status, created_at desc);
create index if not exists telegram_pending_items_group_idx
  on public.telegram_pending_items (group_id);
create index if not exists telegram_pending_items_workspace_idx
  on public.telegram_pending_items (workspace_id);

-- RLS on, no policy: only the service role (which bypasses RLS) can touch these.
alter table public.telegram_groups enable row level security;
alter table public.telegram_pending_items enable row level security;
