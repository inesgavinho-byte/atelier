-- Infra — índices nas foreign keys sem cobertura (auditoria: get_advisors
-- performance → unindexed_foreign_keys). Melhora joins e, sobretudo, evita
-- full scans em cascatas de DELETE/UPDATE nas FKs.
--
-- Nota: CREATE INDEX CONCURRENTLY não pode correr dentro de uma transacção
-- (e as migrações correm em transacção), por isso usa-se CREATE INDEX normal —
-- as tabelas são pequenas e o lock é momentâneo.

create index if not exists activity_agent_id_idx on public.activity (agent_id);
create index if not exists activity_workspace_id_idx on public.activity (workspace_id);
create index if not exists agents_workspace_id_idx on public.agents (workspace_id);
create index if not exists artifacts_workspace_id_idx on public.artifacts (workspace_id);
create index if not exists decisions_agent_id_idx on public.decisions (agent_id);
create index if not exists decisions_workspace_id_idx on public.decisions (workspace_id);
create index if not exists documents_project_id_idx on public.documents (project_id);
create index if not exists minion_signals_workspace_id_idx on public.minion_signals (workspace_id);
create index if not exists objectives_workspace_id_idx on public.objectives (workspace_id);
create index if not exists readings_used_in_artifact_id_idx on public.readings (used_in_artifact_id);
create index if not exists readings_workspace_id_idx on public.readings (workspace_id);
create index if not exists telegram_groups_project_id_idx on public.telegram_groups (project_id);
create index if not exists telegram_groups_workspace_id_idx on public.telegram_groups (workspace_id);
create index if not exists timeline_events_project_id_idx on public.timeline_events (project_id);
create index if not exists user_workspace_profiles_workspace_id_idx on public.user_workspace_profiles (workspace_id);
create index if not exists workspace_context_project_id_idx on public.workspace_context (project_id);
