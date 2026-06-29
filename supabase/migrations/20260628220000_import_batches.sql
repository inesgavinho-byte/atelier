-- Importação em batch de conversas (Claude.ai / ChatGPT / Perplexity).
--
-- import_batches guarda, temporariamente, as conversas parseadas de um upload,
-- para o preview + mapeamento acontecerem sem voltar a enviar o ficheiro (que
-- nunca fica no browser). context_imports.external_id permite deduplicar uma
-- conversa já importada (mesmo source + id externo). RLS fechada ao service
-- role, como as restantes tabelas de importação.

alter table public.context_imports add column if not exists external_id text;

create index if not exists context_imports_source_external_idx
  on public.context_imports (source, external_id);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  conversations jsonb not null default '[]',
  created_at timestamptz default now()
);

alter table public.import_batches enable row level security;
