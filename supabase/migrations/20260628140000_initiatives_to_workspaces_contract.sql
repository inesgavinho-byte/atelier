-- Migração initiatives → workspaces — FASE CONTRACT.
--
-- ⚠️ NÃO APLICAR até o frontend (PR2) estar em PRODUÇÃO a usar workspace_id.
-- Remove `initiative_id` das tabelas dependentes e a tabela `initiatives`.
-- É destrutivo/irreversível em termos de dados — só correr depois de confirmar:
--   * workspace_id 100% preenchido (a fase EXPAND verificou-o), e
--   * nenhum código em produção lê mais `initiatives` / `initiative_id`.

alter table public.decisions  drop column if exists initiative_id;
alter table public.objectives drop column if exists initiative_id;
alter table public.activity   drop column if exists initiative_id;
alter table public.artifacts  drop column if exists initiative_id;
alter table public.readings   drop column if exists initiative_id;

drop table if exists public.initiatives;

-- `workspaces.legacy_initiative_id` pode manter-se (auditoria / redirect por id
-- antigo). Remover apenas quando nada depender dele:
-- alter table public.workspaces drop column if exists legacy_initiative_id;
