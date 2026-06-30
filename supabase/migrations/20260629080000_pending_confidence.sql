-- Personal Decimin v2 — Confidence. Each pending item carries how sure the
-- Decimin is that it's real (0..1) and a short reason, so the user always
-- understands why something is being surfaced (98% "prometeu explicitamente"
-- vs 52% "redacção ambígua"). Emitted by the worker's Conversation Watch.

alter table public.telegram_pending_items add column if not exists confidence real;
alter table public.telegram_pending_items add column if not exists confidence_reason text;
