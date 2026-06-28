-- Importação de contexto de outros chats (Claude.ai, ChatGPT, Perplexity, …).
--
-- Guarda o texto bruto importado e o que o Council (Claude Haiku) extraiu dele
-- (decisões, artefactos, lições, resumo). O merge com workspace_context é feito
-- pelo servidor. RLS fechada ao service role, como jobs / workspace_context —
-- só o servidor lhe acede.

create table if not exists public.context_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source text not null,                 -- 'claude' | 'chatgpt' | 'perplexity' | 'other'
  raw_content text not null,
  processed boolean default false,
  extracted jsonb default '{}',         -- { decisions, artifacts, lessons, summary }
  created_at timestamptz default now()
);

create index if not exists context_imports_workspace_id_idx
  on public.context_imports (workspace_id);

alter table public.context_imports enable row level security;
