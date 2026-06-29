-- Council enrichments: per-message metadata (Perplexity citations, suggested
-- next steps). Nullable/defaulted, additive — existing rows are unaffected.
alter table public.workspace_messages
  add column if not exists metadata jsonb default '{}'::jsonb;
