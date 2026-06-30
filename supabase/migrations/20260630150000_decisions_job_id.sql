-- ADR-0002 (PR2) — gate de aprovação por step. Liga uma decisão
-- (kind='job-step') ao job que aguarda aprovação humana. O worker corre o job
-- assim que a decisão linkada fica 'aprovada'. on delete cascade: apagar o job
-- limpa a sua decisão de aprovação.
alter table public.decisions
  add column if not exists job_id uuid references public.jobs(id) on delete cascade;
create index if not exists decisions_job_id_idx on public.decisions (job_id);
