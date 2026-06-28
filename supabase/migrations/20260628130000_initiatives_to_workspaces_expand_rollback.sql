-- ROLLBACK da fase EXPAND (reverter antes de aplicar o CONTRACT).
-- Repõe o estado anterior: remove workspace_id das dependentes e os 5 workspaces
-- migrados. As iniciativas e initiative_id nunca foram tocados, por isso isto
-- devolve o sistema ao ponto de partida sem perda de dados.

alter table public.decisions  drop constraint if exists decisions_workspace_id_fkey;
alter table public.objectives drop constraint if exists objectives_workspace_id_fkey;
alter table public.activity   drop constraint if exists activity_workspace_id_fkey;
alter table public.artifacts  drop constraint if exists artifacts_workspace_id_fkey;
alter table public.readings   drop constraint if exists readings_workspace_id_fkey;

alter table public.decisions  drop column if exists workspace_id;
alter table public.objectives drop column if exists workspace_id;
alter table public.activity   drop column if exists workspace_id;
alter table public.artifacts  drop column if exists workspace_id;
alter table public.readings   drop column if exists workspace_id;

delete from public.workspaces where legacy_initiative_id is not null;

drop index if exists public.workspaces_slug_key;

alter table public.workspaces
  drop column if exists slug,
  drop column if exists intent,
  drop column if exists progress,
  drop column if exists focus,
  drop column if exists agent_ids,
  drop column if exists sort,
  drop column if exists legacy_initiative_id;

-- Os created_at/updated_at adicionados às tabelas antigas são inofensivos e
-- podem manter-se; remover só se for mesmo necessário.
