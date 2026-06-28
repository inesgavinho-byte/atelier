-- POC do runtime de execução (ADR-0002): tabela `jobs`.
-- Fila de trabalhos entre o ATELIER (enfileira) e o worker (executa).
-- RLS fechada: sem políticas anon/authenticated — só o service role lhe acede,
-- tal como connector_credentials. Aplicada ao projeto "Atelier" via MCP.

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  step integer not null default 1,
  status text not null default 'queued',
  prompt text not null,
  workspace text,
  output text,
  artifacts jsonb default '[]',
  error text,
  approved_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.jobs enable row level security;

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);
