-- Personal Decimin v2 — Shadow Mode. Every capability has a mode: it runs in
-- 'shadow' (computes but doesn't act/notify), 'active' (acts), or 'off'. New
-- capabilities start silent and are only promoted to 'active' once the user
-- has compared their shadow output and trusts them. RLS-locked to the service
-- role (the worker reads/writes; the app reads via the admin client).

create table if not exists public.decimin_capabilities (
  capability text primary key,
  mode text not null default 'shadow', -- 'shadow' | 'active' | 'off'
  last_shadow_output text,
  last_shadow_at timestamptz,
  updated_at timestamptz not null default now()
);

-- The existing, already-trusted outward capabilities start active.
insert into public.decimin_capabilities (capability, mode) values
  ('daily_briefing', 'active'),
  ('watch_notifications', 'active')
on conflict (capability) do nothing;

alter table public.decimin_capabilities enable row level security;
