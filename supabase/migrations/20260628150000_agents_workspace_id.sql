-- Migração initiatives → workspaces — passo 6: relação directa agents ↔ workspace.
--
-- Os agentes são partilhados por vários workspaces (relação N:N mantida em
-- workspaces.agent_ids). Aqui acrescentamos uma referência DIRECTA `workspace_id`
-- (o workspace "casa" do agente = o de menor `sort` cujo agent_ids o contém),
-- mantendo agent_ids como array de referência rápida. Aditivo e não destrutivo.

alter table public.agents add column if not exists workspace_id uuid;

update public.agents a set workspace_id = (
  select w.id
  from public.workspaces w
  where a.id = any (w.agent_ids)
  order by w.sort asc
  limit 1
)
where a.workspace_id is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agents_workspace_id_fkey') then
    alter table public.agents add constraint agents_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces(id) on delete set null;
  end if;
end $$;
