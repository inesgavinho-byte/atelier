-- Living Artifacts v1 (Bloco E). Artefactos deixam de ser ficheiros
-- descartáveis: ganham conteúdo canónico e um número de revisão, e cada
-- actualização arquiva a versão anterior em artifact_revisions. O conteúdo
-- actual vive em artifacts.content (revision = revisão actual); o histórico
-- vive em artifact_revisions. Permissive RLS como as outras tabelas de dados
-- do workspace.

alter table public.artifacts add column if not exists content text not null default '';
alter table public.artifacts add column if not exists revision integer not null default 1;

create table if not exists public.artifact_revisions (
  id uuid primary key default gen_random_uuid(),
  artifact_id text not null references public.artifacts(id) on delete cascade,
  content text not null default '',
  revision integer not null,
  created_at timestamptz not null default now()
);

create index if not exists artifact_revisions_artifact_idx
  on public.artifact_revisions (artifact_id, revision desc);

alter table public.artifact_revisions enable row level security;

do $$ begin
  create policy artifact_revisions_all on public.artifact_revisions
    for all using (true) with check (true);
exception when duplicate_object then null; end $$;
