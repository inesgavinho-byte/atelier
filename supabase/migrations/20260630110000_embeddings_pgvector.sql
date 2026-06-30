-- RAG a escala — embeddings de JSONB para pgvector real.
--
-- document_chunks.embedding era JSONB (array de 1536 floats) e o cosseno era
-- calculado em processo (lê até 500 chunks e ordena em JS). Aqui passa a vector
-- nativo + índice HNSW + RPC de pesquisa no servidor (`<=>`), destravando RAG a
-- escala. Idempotente e não-destrutivo: o swap só corre se a coluna ainda for
-- JSONB (no ambiente já migrado, é no-op).

create extension if not exists vector;

do $$
begin
  if (
    select data_type from information_schema.columns
    where table_schema = 'public'
      and table_name = 'document_chunks'
      and column_name = 'embedding'
  ) = 'jsonb' then
    -- Coluna nova + migração dos dados antes de remover a antiga (reversível).
    alter table public.document_chunks add column if not exists embedding_vector vector(1536);
    update public.document_chunks
      set embedding_vector = (embedding::text)::vector
      where embedding is not null;
    alter table public.document_chunks drop column embedding;
    alter table public.document_chunks rename column embedding_vector to embedding;
  end if;
end $$;

-- Índice HNSW (cosine) — melhor recall/performance que ivfflat a este volume.
create index if not exists document_chunks_embedding_hnsw
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Pesquisa semântica no servidor: top-K por distância de cosseno, com floor.
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_workspace uuid,
  match_project uuid default null,
  match_floor double precision default 0.2,
  match_count int default 5
)
returns table (
  document_id uuid,
  document_title text,
  idx int,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select dc.document_id,
         coalesce(d.title, '(documento)') as document_title,
         dc.idx,
         dc.content,
         1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  left join public.documents d on d.id = dc.document_id
  where dc.workspace_id = match_workspace
    and (match_project is null or dc.project_id = match_project)
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) > match_floor
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
