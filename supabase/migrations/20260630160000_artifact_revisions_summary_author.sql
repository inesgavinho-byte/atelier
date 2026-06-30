-- Sprint 3 — Living Artifacts com revisões reais. artifact_revisions ganha o
-- summary (o que mudou, gerado por Haiku) e o created_by (Council, utilizador ou
-- Decimin). Modelo: cada revisão — incluindo a actual — é uma linha em
-- artifact_revisions; artifacts.content/revision é a denormalização da última.
alter table public.artifact_revisions
  add column if not exists summary text not null default '';
alter table public.artifact_revisions
  add column if not exists created_by text not null default 'Council';

-- Uma revisão por número, por artefacto.
create unique index if not exists artifact_revisions_artifact_revision_uidx
  on public.artifact_revisions (artifact_id, revision);

-- Backfill: os artefactos existentes passam a ter a sua revisão actual como
-- linha de histórico (revisão 1 para os 7 actuais). Idempotente.
insert into public.artifact_revisions (artifact_id, content, revision, summary, created_by)
select a.id, a.content, a.revision, 'Revisão inicial', 'Backfill'
from public.artifacts a
where not exists (
  select 1 from public.artifact_revisions r where r.artifact_id = a.id
);
