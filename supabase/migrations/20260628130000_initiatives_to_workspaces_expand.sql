-- Migração initiatives → workspaces — FASE EXPAND (aditiva e reversível).
--
-- NÃO remove `initiatives` nem `initiative_id`: a app actualmente em produção
-- continua a ler esses dados e a funcionar. A remoção fica para a fase CONTRACT
-- (ver 20260628140000_…_contract.sql), aplicada só DEPOIS de o frontend (PR2)
-- estar em produção a usar workspace_id. Assim não há janela de app partida e
-- nada é apagado até estar seguro.
--
-- Idempotente: pode ser reaplicada sem efeitos colaterais.

-- 1. Estender `workspaces` com as colunas que existem em `initiatives`.
alter table public.workspaces
  add column if not exists slug text,
  add column if not exists intent text,
  add column if not exists progress integer not null default 0,
  add column if not exists focus text not null default '',
  add column if not exists agent_ids text[] not null default '{}',
  add column if not exists sort integer not null default 0,
  -- chave de mapeamento old_id → workspace, usada nos backfills e no redirect.
  add column if not exists legacy_initiative_id text;

-- 2. Migrar as iniciativas para workspaces (UUIDs novos). Idempotente.
--    description recebe o intent (a coluna existente fica preenchida) e intent
--    guarda o mesmo valor mais rico.
insert into public.workspaces
  (name, description, status, slug, intent, progress, focus, agent_ids, sort, legacy_initiative_id)
select i.name, i.intent, 'Ativo', i.slug, i.intent, i.progress, i.focus, i.agent_ids, i.sort, i.id
from public.initiatives i
where not exists (
  select 1 from public.workspaces w where w.legacy_initiative_id = i.id
);

create unique index if not exists workspaces_slug_key
  on public.workspaces (slug) where slug is not null;

-- 3. Tabelas dependentes: adicionar workspace_id, backfill pelo mapeamento, FK.
--    `initiative_id` MANTÉM-SE (removido só na fase CONTRACT).
alter table public.decisions  add column if not exists workspace_id uuid;
alter table public.objectives add column if not exists workspace_id uuid;
alter table public.activity   add column if not exists workspace_id uuid;
alter table public.artifacts  add column if not exists workspace_id uuid;
alter table public.readings   add column if not exists workspace_id uuid;

update public.decisions d  set workspace_id = w.id
  from public.workspaces w where w.legacy_initiative_id = d.initiative_id and d.workspace_id is null;
update public.objectives o set workspace_id = w.id
  from public.workspaces w where w.legacy_initiative_id = o.initiative_id and o.workspace_id is null;
update public.activity a   set workspace_id = w.id
  from public.workspaces w where w.legacy_initiative_id = a.initiative_id and a.workspace_id is null;
update public.artifacts ar set workspace_id = w.id
  from public.workspaces w where w.legacy_initiative_id = ar.initiative_id and ar.workspace_id is null;
update public.readings r   set workspace_id = w.id
  from public.workspaces w where w.legacy_initiative_id = r.initiative_id and r.workspace_id is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'decisions_workspace_id_fkey') then
    alter table public.decisions add constraint decisions_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'objectives_workspace_id_fkey') then
    alter table public.objectives add constraint objectives_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'activity_workspace_id_fkey') then
    alter table public.activity add constraint activity_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'artifacts_workspace_id_fkey') then
    alter table public.artifacts add constraint artifacts_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'readings_workspace_id_fkey') then
    alter table public.readings add constraint readings_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces(id) on delete set null;
  end if;
end $$;

-- 4. Timestamps nas tabelas antigas que ainda não os têm (artifacts já tem updated_at).
alter table public.decisions
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
alter table public.objectives
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
alter table public.activity
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
alter table public.artifacts
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 5. Agentes: a relação agente↔workspace mantém-se via `workspaces.agent_ids`
--    (migrado de initiatives.agent_ids). A tabela `agents` não muda — é a opção
--    mais limpa porque um agente pode servir vários workspaces (N:N por array),
--    tal como já acontecia com as iniciativas.
