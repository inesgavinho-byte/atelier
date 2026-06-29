-- Timeline GitHub events. To record commits/PRs/deploys idempotently (the repo
-- overview is re-fetched on each view), timeline_events gains an external_id
-- (e.g. 'pr-42', 'commit-<sha>'). A unique index over (workspace_id, kind,
-- external_id) lets the sync upsert-ignore duplicates. NULLs are distinct, so
-- the existing explicit events (no external_id) are unaffected.

alter table public.timeline_events add column if not exists external_id text;

create unique index if not exists timeline_events_external_idx
  on public.timeline_events (workspace_id, kind, external_id);
