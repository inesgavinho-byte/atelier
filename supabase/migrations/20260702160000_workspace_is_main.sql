-- Workspace OI — flag do workspace principal. Só um workspace deve ter is_main;
-- activa a visibilidade federada (painel de repos + contexto global do Council).
alter table public.workspaces add column if not exists is_main boolean not null default false;
update public.workspaces set is_main = true where id = '07476848-91cc-48c9-8fd7-cab828d4c7a0';

-- Ligar repos conhecidos (idempotente).
update public.workspaces set github_repo = 'inesgavinho-byte/atelier' where name = 'WORKSPACE' and (github_repo is null or github_repo = '');
update public.workspaces set github_repo = 'inesgavinho-byte/DECIMA' where name = 'DECIMA' and (github_repo is null or github_repo = '');
