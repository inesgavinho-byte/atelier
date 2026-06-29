-- Bloco 5 — Pipeline de conhecimento (Node-first). Documents per workspace,
-- their canonical Markdown, and keyword-searchable chunks. The `embedding`
-- column is a placeholder for future semantic search. Original-file storage +
-- MarkItDown (OCR/Office) arrive with the Python converter service; here the
-- converter seam handles text/markdown and queues binaries.
--
-- Permissive RLS (like the other workspace data tables): reads go through the
-- normal client; writes through server actions.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.workspace_projects(id) on delete set null,
  title text not null,
  source_name text,
  kind text,
  markdown text default '',
  char_count integer not null default 0,
  status text not null default 'ready', -- 'ready' | 'pending_conversion'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idx integer not null,
  content text not null,
  embedding jsonb, -- placeholder for future semantic search
  created_at timestamptz not null default now()
);

create index if not exists documents_workspace_idx
  on public.documents (workspace_id, created_at desc);
create index if not exists document_chunks_workspace_idx
  on public.document_chunks (workspace_id);
create index if not exists document_chunks_document_idx
  on public.document_chunks (document_id, idx);

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

do $$ begin
  create policy documents_all on public.documents for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy document_chunks_all on public.document_chunks for all using (true) with check (true);
exception when duplicate_object then null; end $$;
