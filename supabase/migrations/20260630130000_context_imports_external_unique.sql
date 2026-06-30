-- Quick win (4c) — reimportações idempotentes. context_imports.external_id já
-- existe; falta a unicidade. Índice único (workspace_id, external_id): NULLs
-- são distintos, por isso imports antigos (sem external_id) não colidem.
create unique index if not exists context_imports_workspace_external_uidx
  on public.context_imports (workspace_id, external_id);
