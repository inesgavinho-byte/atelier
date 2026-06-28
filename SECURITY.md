# Segurança — ATELIER

Este documento descreve o modelo de acesso do ATELIER e a migração de RLS que
fecha o acesso anónimo às tabelas. A migração **não foi executada** — está aqui
documentada para ser aplicada de forma coordenada (ver pré-requisitos).

## 1. Porta de acesso (access gate)

Toda a aplicação pode ficar atrás de uma única palavra-passe partilhada.

- **Ligada** quando `ATELIER_ACCESS_PASSWORD` está definida no ambiente.
- **Desligada** quando a variável não existe — a app comporta-se como antes,
  sem risco de bloqueio.

Funcionamento:

1. O `middleware.ts` corre em todas as rotas (excepto estáticos do Next). Se a
   porta estiver ligada e não houver cookie de sessão válido, redirecciona para
   `/login`.
2. `/login` valida a palavra-passe no servidor (comparação em tempo constante)
   e emite um cookie de sessão assinado (HMAC-SHA256, Web Crypto), `httpOnly`,
   `sameSite=lax`, `secure` em produção, válido 30 dias.
3. O segredo de assinatura é `ATELIER_SESSION_SECRET` (se definido) ou, em
   alternativa, a própria palavra-passe. Mudar a palavra-passe invalida as
   sessões existentes.

A palavra-passe e o segredo **nunca chegam ao browser** — só assinaturas.

## 2. Chave do Supabase no servidor

`getSupabase()` (server-only) passa a preferir `SUPABASE_SERVICE_ROLE_KEY`
quando existe, caindo para a chave anónima (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
quando não existe. A chave é escolhida no servidor e nunca é exposta no browser.

Preferir o service role é o que permite manter as leituras a funcionar depois de
fechar o RLS ao acesso anónimo (secção 3).

## 3. Migração de RLS — fechar o acesso anónimo (NÃO EXECUTADA)

Hoje, as 12 tabelas de dados têm uma política `ALL` permissiva (`USING true`)
para os papéis `anon` e `authenticated`. Combinado com a chave anónima no
cliente, qualquer pessoa com o URL e a chave pública poderia ler/escrever.

A migração abaixo remove essas políticas. O service role **ignora o RLS**, pelo
que a aplicação continua a ler/escrever desde que use a service role key.

> ### ⚠️ Pré-requisito obrigatório
>
> Só aplicar **depois** de confirmar que `SUPABASE_SERVICE_ROLE_KEY` está
> definida no ambiente de deploy (Netlify). Sem isso, a app fica sem leituras
> (degrada para estados vazios) porque a chave anónima deixa de ter acesso.

```sql
-- Fecha o acesso anónimo: remove as políticas permissivas das 12 tabelas.
-- O service role continua a aceder (ignora RLS). RLS permanece ENABLED.
drop policy if exists "activity_all"          on public.activity;
drop policy if exists "agents_all"            on public.agents;
drop policy if exists "artifacts_all"         on public.artifacts;
drop policy if exists "captures_all"          on public.captures;
drop policy if exists "decisions_all"         on public.decisions;
drop policy if exists "initiatives_all"       on public.initiatives;
drop policy if exists "objectives_all"        on public.objectives;
drop policy if exists "readings_all"          on public.readings;
drop policy if exists "workspace_chats_all"   on public.workspace_chats;
drop policy if exists "workspace_messages_all" on public.workspace_messages;
drop policy if exists "workspace_projects_all" on public.workspace_projects;
drop policy if exists "workspaces_all"        on public.workspaces;
```

Para reverter (reabrir o acesso anónimo), recriar uma política por tabela:

```sql
-- Exemplo de reversão para uma tabela:
create policy "activity_all" on public.activity
  for all to anon, authenticated using (true) with check (true);
```

A tabela `connector_credentials` já está fechada (RLS ligado, 0 políticas
anónimas — apenas o service role lhe acede) e não é afectada por esta migração.
