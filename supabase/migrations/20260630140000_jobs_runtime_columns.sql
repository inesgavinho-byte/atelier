-- ADR-0002 — Runtime de execução real. Colunas para o gate de aprovação humana,
-- o plano por step e o log de progresso (polling pela UI /jobs). `approved_by`
-- e `artifacts` já existiam.
--
-- step_plan: array de { step, prompt, status, approved_at }.
-- progress_log: linhas append-only escritas pelo worker a cada passo.

alter table public.jobs add column if not exists requires_approval boolean not null default false;
alter table public.jobs add column if not exists approved_at timestamptz;
alter table public.jobs add column if not exists step_plan jsonb not null default '[]';
alter table public.jobs add column if not exists progress_log text[] not null default '{}';
