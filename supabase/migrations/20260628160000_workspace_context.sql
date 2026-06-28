-- ADR-0004 — memória comprimida por workspace.
--
-- O agente de contexto (worker Railway) faz upsert de um resumo + extractos
-- (decisões, artefactos, lições) por workspace. O chat contínuo injecta este
-- contexto no system prompt. RLS fechada ao service role, como `jobs` e
-- `connector_credentials` — só o servidor/worker lhe acedem.

create table if not exists public.workspace_context (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  summary text not null default '',
  decisions jsonb default '[]',
  artifacts jsonb default '[]',
  lessons jsonb default '[]',
  last_updated_at timestamptz default now(),
  version integer not null default 1,
  created_at timestamptz default now()
);

create unique index if not exists workspace_context_workspace_id_idx
  on public.workspace_context (workspace_id);

alter table public.workspace_context enable row level security;

-- Saber com que versão de contexto cada mensagem foi enviada.
alter table public.workspace_messages
  add column if not exists context_version integer;
