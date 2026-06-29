-- Supabase por workspace.
--
-- Cada workspace pode apontar para o seu próprio projecto Supabase. As
-- CREDENCIAIS (anon key, service role) vivem em connector_credentials
-- (encriptadas, RLS-locked ao service role) — nunca na tabela workspaces.
-- Aqui guardam-se apenas os identificadores não-secretos (URL e project ref),
-- espelhados para leitura barata pelo painel (link do dashboard, badge de
-- estado) sem precisar de desencriptar. Colunas nullable e aditivas.

alter table public.workspaces add column if not exists supabase_url        text;
alter table public.workspaces add column if not exists supabase_anon_key   text;
alter table public.workspaces add column if not exists supabase_project_id text;
