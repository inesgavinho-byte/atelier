-- Sprint 4 — Pattern Decimin transversal. Os sinais de padrão (kind='pattern')
-- carregam metadados estruturados: spaces envolvidos, confiança e tipo de
-- padrão. Coluna genérica jsonb para não restringir sinais futuros.
alter table public.minion_signals
  add column if not exists metadata jsonb not null default '{}'::jsonb;
