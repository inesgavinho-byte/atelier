-- GitHub por workspace.
--
-- Cada workspace pode ter um repositório GitHub associado (formato "owner/repo").
-- O painel de contexto mostra PRs abertos, commits recentes e estado do CI.
-- Coluna nullable e aditiva — workspaces sem repo mantêm-se válidos.

alter table public.workspaces add column if not exists github_repo text;
