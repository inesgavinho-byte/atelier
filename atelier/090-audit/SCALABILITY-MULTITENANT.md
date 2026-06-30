---
title: Escalabilidade x1000 + Multi-tenant — ATELIER / DECIMA
date: 2026-06-30
status: arquitectura / plano de migração
---

# Escalabilidade x1000 e multi-tenant

> Documento de arquitectura. Hoje o ATELIER é single-user (maior tabela: 38 rows).
> Aqui analisa-se o que muda para (a) 1000× mais dados e (b) múltiplos
> utilizadores/organizações, e uma sequência de migração faseada sem reescrever
> tudo. **Nada para implementar já.**

## 1. Ponto de partida

- Single Supabase, single worker Railway, Netlify para a web.
- **Sem modelo de ownership**: nenhuma tabela tem `owner_user`/`tenant`; o acesso
  passa pela service role atrás de uma password partilhada.
- **RLS sem dentes**: 14 tabelas com política `USING (true)` (abertas a
  `anon`/`authenticated`); 13 locked à service role.
- Embeddings em JSONB com cosseno em processo (não escala).

A visão (`DECIMA-WORKSPACE-v2`) já define o modelo-alvo: **a unidade económica, de
colaboração e de propriedade é o Space**. "Tudo o que é criado num Space pertence ao
Space, nunca ao indivíduo." Utilizadores **participam**; Spaces **possuem**. Isto é
exactamente um modelo multi-tenant onde o **tenant = Organização** e o **Space** é a
fronteira de partilha/permissão.

---

## 2. Escala x1000 (volume)

Projecção a partir das tabelas actuais, assumindo uso real contínuo:

| Eixo | Hoje | x1000 (ordem de grandeza) | Bottleneck |
|---|---|---|---|
| Mensagens de chat | 27 | ~10⁵–10⁶ | Janela de contexto (`.slice(-30)`) ok; paginação e arquivo necessários |
| Document chunks / embeddings | 21 | ~10⁵–10⁶ | **Cosseno em processo colapsa** — exige pgvector + índice |
| Timeline events | 38 | ~10⁵ | Merge de 6 fontes em runtime fica caro — materializar |
| Jobs | 1 | ~10³/dia | Worker single-process; precisa de concorrência/partição |
| Telegram pending | 0 | ~10⁴ | ok com índices |

### Mudanças por bottleneck

**RAG / embeddings (o mais urgente).**
- `document_chunks.embedding` JSONB → `vector(1536)`; índice HNSW (ou ivfflat) e
  retrieval por `<=>` no SQL. Sem isto, RAG é O(n) em JS por query.
- Filtros pré-vector por `tenant_id`/`space_id` para o índice trabalhar num
  subconjunto.

**Timeline.**
- Hoje `getWorkspaceTimeline()` faz merge de decisões+artefactos+leituras+
  actividade+chats+eventos em runtime. A x1000 isto é um fan-out caro por page load.
- Migrar para **`timeline_events` como tabela de verdade** (já existe e é
  alimentada): todas as fontes escrevem lá (event sourcing leve), a leitura é uma
  query paginada única com índice `(tenant_id, space_id, created_at desc)`.

**Worker / jobs.**
- Hoje é um único processo a fazer poll de 5s e execução simulada. A escala:
  - Concorrência: N workers a competir por jobs via `claim()` atómico (já existe o
    padrão) + `SELECT … FOR UPDATE SKIP LOCKED` ou advisory locks.
  - Partição por tenant para evitar starvation (um tenant não monopoliza a fila).
  - Quando o runtime real existir (ADR-0002), execução isolada por job (worktree/
    container) escala horizontalmente em vez de num só processo.

**Chat / mensagens.**
- Paginação e arquivamento de mensagens antigas; a janela de contexto já é
  limitada, mas a leitura inicial e a timeline precisam de paginar.

**Conexões à BD.**
- Em serverless (Netlify) cada função abre ligação. A x1000 é obrigatório
  **connection pooling** (Supabase Supavisor / PgBouncer em transaction mode) e
  passar a estratégia de conexões Auth de absoluta (10) para percentual.

---

## 3. Multi-tenant (múltiplos utilizadores / organizações)

### Modelo de dados alvo

Hierarquia (alinhada com `DECIMA-WORKSPACE-v2`):

```
Organization (tenant)
  └── Space (= workspace hoje)         ← unidade de ownership e permissão
        └── Project (workspace_projects)
              └── Session / Chat / Documents / Decisions / Artifacts …
User  ──(membership)── Organization     ← utilizador participa; não possui
User  ──(visibility)── Space            ← permissão = visibilidade, não ownership
```

Mudanças de schema (aditivas, não destrutivas):

1. **Novas tabelas:** `organizations`, `organization_members (user_id, org_id,
   role)`, `space_members (user_id, space_id, role/visibility)`.
2. **Coluna `organization_id`** em `workspaces` (Space) e propagada por FK a tudo o
   que pendura abaixo (a maioria já tem `workspace_id` — basta resolver o tenant via
   join ou desnormalizar `organization_id` nas tabelas quentes para RLS rápido).
3. **`owner_space_id` nos artefactos/conhecimento** — a visão exige que o output
   pertença ao Space mesmo em sessões privadas. Sessões ganham `visibility`
   (team/private); ownership é sempre do Space.
4. **Identidade:** adoptar Supabase Auth (já presente) como fonte de `auth.uid()`;
   ligar `profiles`/`user_workspace_profiles` (já existem) a utilizadores reais.

### RLS real (o trabalho central de segurança)

Substituir as 14 políticas `USING (true)` por políticas baseadas em pertença:

```sql
-- exemplo (workspaces = Spaces)
CREATE POLICY space_member_read ON workspaces FOR SELECT
  USING (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));
-- escrita: restringir a membros com role adequado; tabelas-filhas usam
-- o space_id/organization_id desnormalizado para evitar joins na policy.
```

- Desnormalizar `organization_id` (e talvez `space_id`) nas tabelas quentes
  (`workspace_messages`, `document_chunks`, `timeline_events`) para a policy ser um
  índice-lookup e não um join por linha.
- Manter a service role para o worker (operações de sistema), mas as leituras do
  utilizador passam a `authenticated` com RLS efectivo.
- **Visibilidade ≠ ownership**: `space_members` controla quem vê; o `owner_space_id`
  garante que o trabalho fica no Space quando alguém sai.

### Custo de LLM a escala e o papel do Council

- A x1000 utilizadores activos, o custo dominante é LLM, não infra.
- O agente de contexto (ADR-0004) estima ~$0.01–0.05/hora por workspace activo —
  a 1000 workspaces activos são ~$10–50/hora só de compressão de contexto. **Tornar
  o agente event-driven** (correr só quando há mensagens novas) em vez de horário
  cego corta isto drasticamente.
- O **routing do Council é a alavanca de custo**: encaminhar resumos/classificação
  para Groq/Haiku (barato e rápido) e reservar Claude/GPT para raciocínio. Hoje o
  routing existe mas o fallback ignora Groq/DeepSeek (corrigir — ver
  `ROI-IMPROVEMENTS.md` #2).
- Cache semântico de respostas e *prompt caching* (contexto de workspace é estável)
  reduzem tokens repetidos.
- Quotas/orçamento por tenant para evitar que um tenant gaste o orçamento global.

---

## 4. Infra

**Supabase.**
- Plano: passar de Free/POC para Pro/Team conforme rows e conexões.
- **Connection pooling** obrigatório (Supavisor, transaction mode) para serverless.
- **Read replicas** para as leituras pesadas (timeline, RAG) quando a carga de
  leitura dominar.
- pgvector com índice; particionar `workspace_messages`/`timeline_events` por tempo
  ou por tenant se uma tabela passar dezenas de milhões de rows.

**Railway (worker).**
- Hoje single-process. Escalar para N réplicas com `claim()`/`SKIP LOCKED`;
  separar loops (Telegram, contexto, minions, jobs) em serviços independentes para
  escalarem e falharem isoladamente.
- Quando o runtime real existir, execução de jobs em containers efémeros por job.

**Netlify.**
- Limites de função (corpo ~6 MB — já obriga o upload de binários a passar pelo
  MarkItDown e a cap de 4 MB no cliente). A escala, considerar uploads directos
  para storage (signed URL) em vez de passar bytes pela função.
- Edge functions para auth/gate e leituras leves; manter o pesado em route handlers
  ou no worker.

---

## 5. Sequência de migração faseada (sem reescrever tudo)

**Fase 0 — Fundações invisíveis (sem mudar UX).**
- pgvector + índices FK; connection pooling; timeline como tabela de verdade.
- Tornar o agente de contexto event-driven. *(Tudo isto beneficia já o single-user.)*

**Fase 1 — Identidade real.**
- Activar Supabase Auth; ligar `profiles`/`user_workspace_profiles` a `auth.uid()`.
- Introduzir `organizations` + `organization_members` com **um** tenant default
  (a org actual). Backfill: tudo o que existe → essa org. Zero impacto funcional.

**Fase 2 — Ownership por Space.**
- Adicionar `organization_id` (e `space_id` desnormalizado nas tabelas quentes) por
  migração aditiva + backfill. `space_members` para visibilidade. Sessões ganham
  `visibility`.

**Fase 3 — RLS efectivo.**
- Substituir as 14 políticas `USING(true)` por políticas de pertença, tabela a
  tabela, **atrás de feature flag** e testadas com a org default (deve ser no-op
  para o utilizador actual). Service role continua para o worker.

**Fase 4 — Multi-org real.**
- Onboarding de uma segunda organização; quotas/orçamento de LLM por tenant;
  isolamento verificado (um tenant nunca vê dados de outro).

**Fase 5 — Escala horizontal.**
- N workers, read replicas, partição de tabelas quentes conforme a carga observada.

Cada fase é aditiva e reversível; nenhuma exige reescrever o laço central. O risco
está concentrado na Fase 3 (RLS) — daí o feature flag e os testes com a org default
antes de abrir a multi-org.
