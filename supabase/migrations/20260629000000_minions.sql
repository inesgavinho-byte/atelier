-- EPIC-003 Fase 1 — Minions 24/7.
--
-- Minions are specialised watchers that observe, organise and propose — never
-- decide alone. Each run produces a signal (Signal → Evidence → Interpretation
-- → Recommended Action → Approval Required?). Both tables are RLS-locked to the
-- service role (no policies): only the Railway worker and server-side reads
-- (service role) touch them, never the browser.

create table if not exists public.minions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  mission text not null,
  sources jsonb default '[]',
  frequency_minutes integer not null default 60,
  autonomy_level integer not null default 2,
  state text not null default 'active', -- 'active' | 'paused' | 'error'
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_signal jsonb,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.minions enable row level security;

create table if not exists public.minion_signals (
  id uuid primary key default gen_random_uuid(),
  minion_id uuid not null references public.minions(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  kind text not null, -- 'info'|'warning'|'decision_required'|'opportunity'|'risk'
  signal text not null,
  evidence jsonb default '[]',
  interpretation text,
  recommended_action text,
  approval_required boolean default false,
  status text not null default 'pending', -- 'pending'|'reviewed'|'actioned'|'dismissed'
  created_at timestamptz default now()
);

alter table public.minion_signals enable row level security;

create index if not exists minion_signals_minion_idx
  on public.minion_signals (minion_id, created_at desc);
create index if not exists minion_signals_status_idx
  on public.minion_signals (status, created_at desc);

-- Seed the six Fase 1 minions (idempotent on slug).
insert into public.minions (name, slug, mission, frequency_minutes, autonomy_level)
values
  ('Inbox Minion', 'inbox', 'Processar capturas e imports recentes', 30, 2),
  ('Context Minion', 'context', 'Manter contexto dos workspaces actualizado', 60, 2),
  ('Decision Minion', 'decision', 'Detectar e preparar cartões de decisão', 60, 3),
  ('Project Sentinel', 'project-sentinel', 'Vigiar PRs, decisões pendentes e bloqueios', 120, 2),
  ('Product Minion', 'product', 'Estado do produto e verificação de ADRs', 120, 2),
  ('Pattern Minion', 'pattern', 'Detectar padrões invisíveis entre workspaces', 1440, 2)
on conflict (slug) do nothing;
