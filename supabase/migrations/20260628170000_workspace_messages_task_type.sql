-- Council routing (ADR-0004): record the task type detected for each message,
-- so the model choice is explainable and analysable later. Nullable, additive.
alter table public.workspace_messages add column if not exists task_type text;
