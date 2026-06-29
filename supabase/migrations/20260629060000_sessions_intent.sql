-- ADR-0005 F2 — Sessões com intenção. Em vez de renomear workspace_chats →
-- sessions (rename destrutivo que tocaria todo o código + worker + dados
-- vivos), estende-se a tabela de forma aditiva: cada chat pode ser uma sessão
-- com objectivo, skill (skill_id já existe), estado e fim. O chat contínuo
-- (sem objective) mantém-se exactamente como está; as sessões intencionais são
-- as linhas com `objective` preenchido.

alter table public.workspace_chats add column if not exists objective text;
alter table public.workspace_chats add column if not exists ended_at timestamptz;
alter table public.workspace_chats add column if not exists outputs jsonb default '[]';
alter table public.workspace_chats add column if not exists session_state text default 'active';
-- 'active' | 'completed' | 'archived'
