-- Migração initiatives → workspaces — FASE CONTRACT.
--
-- ✅ APLICADA em 2026-06-28, depois de confirmar: workspace_id 100% preenchido
-- em todas as dependentes, e zero referências a `initiatives`/`initiative_id`
-- no código (frontend já migrado e mergeado). O mapeamento sobrevive em
-- workspaces.legacy_initiative_id, por isso a remoção é recuperável se preciso.
-- Remove `initiative_id` das tabelas dependentes e a tabela `initiatives`.

alter table public.decisions  drop column if exists initiative_id;
alter table public.objectives drop column if exists initiative_id;
alter table public.activity   drop column if exists initiative_id;
alter table public.artifacts  drop column if exists initiative_id;
alter table public.readings   drop column if exists initiative_id;

drop table if exists public.initiatives;

-- `workspaces.legacy_initiative_id` pode manter-se (auditoria / redirect por id
-- antigo). Remover apenas quando nada depender dele:
-- alter table public.workspaces drop column if exists legacy_initiative_id;
