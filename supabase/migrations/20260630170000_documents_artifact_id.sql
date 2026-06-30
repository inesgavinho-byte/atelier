-- Sprint 3 PR2 — artefactos como contexto RAG. Cada artefacto é indexado como
-- um documento (kind='artifact') ligado por artifact_id, reutilizando o pipeline
-- de chunking + embeddings (document_chunks + match_document_chunks). Assim a
-- pesquisa semântica encontra o conteúdo dos artefactos sem alterar o RPC.
alter table public.documents
  add column if not exists artifact_id text references public.artifacts(id) on delete cascade;
create unique index if not exists documents_artifact_id_uidx
  on public.documents (artifact_id) where artifact_id is not null;
