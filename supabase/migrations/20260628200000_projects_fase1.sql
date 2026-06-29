-- ADR-0005 Fatia 1 — Projectos dentro de workspaces.
--
-- Projects already exist (workspace_projects) but gain a GitHub repo of their
-- own and an explicit sort order. Workspace context becomes addressable per
-- project: a NULL project_id is the workspace-level memory; a non-NULL one is a
-- project's own memory.

-- 1. Projects: per-project GitHub repo + explicit ordering.
alter table public.workspace_projects
  add column if not exists github_repo text;
alter table public.workspace_projects
  add column if not exists sort integer not null default 0;

-- 2. Context can now be scoped to a project (NULL = workspace-level).
alter table public.workspace_context
  add column if not exists project_id uuid
  references public.workspace_projects(id) on delete cascade;

-- 3. Re-key uniqueness on (workspace_id, project_id). NULLS NOT DISTINCT
--    (Postgres 15+) keeps exactly one workspace-level row per workspace while
--    allowing one row per (workspace, project). Replaces the old workspace-only
--    unique index, so upserts now conflict-target both columns.
drop index if exists public.workspace_context_workspace_id_idx;
create unique index if not exists workspace_context_ws_proj_idx
  on public.workspace_context (workspace_id, project_id) nulls not distinct;
