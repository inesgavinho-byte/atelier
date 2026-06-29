---
id: ARCHITECTURE
title: Arquitectura Técnica
version: v0.1
status: Draft
owner: Inês Gavinho
created: 2026-06-29
updated: 2026-06-29
depends_on:
  - AT-0002
  - AT-0005
  - VISION
impacts:
  - Development
---

# Arquitectura Técnica do ATELIER

Documenta a arquitectura **real (implementada)** e separa-a do **planeado**.
Não inventa funcionalidades.

## 1. Stack confirmada

- **Monorepo** npm workspaces:
  - `apps/web` (`@atelier/web`) — Next.js 14 App Router, React 18, TypeScript,
    Tailwind. Render server-side; *server actions* + um *route handler* de
    streaming. Deploy **Netlify**.
  - `apps/worker` (`@atelier/worker`) — worker Node (TypeScript) em *polling*.
    Deploy **Railway**.
- **Supabase** — Postgres + RLS. Dois clientes server-only:
  `getSupabase()` (prefere o service role, cai no anon) e `getSupabaseAdmin()`
  (service role apenas; `null` sem chave).

## 2. Modelo de dados

18 tabelas em `public` (estado actual). Migrações em `supabase/migrations/`.

**Workspaces / projectos / chat**
- `workspaces` — workspace (ex-"initiative"); inclui `slug`, `github_repo`,
  `supabase_*`.
- `workspace_projects` — projectos dentro de um workspace (`github_repo`, `sort`).
- `workspace_chats` — chat contínuo (project-less = workspace; com `project_id` =
  projecto).
- `workspace_messages` — mensagens (`role`, `content`, `model`, `tokens`,
  `task_type`, `metadata` jsonb: citations + próximos passos).
- `workspace_context` — memória comprimida por workspace **e** por projecto
  (chave `(workspace_id, project_id)`, `NULLS NOT DISTINCT`). RLS-locked.

**Trabalho operacional**
- `decisions`, `objectives`, `artifacts`, `activity`, `agents`, `captures`,
  `readings`.

**Conectores / importação**
- `connector_credentials` (RLS-locked, encriptada com `ATELIER_CRED_KEY`),
  `context_imports`, `import_batches`.

**Runtime / autonomia**
- `jobs` (fila de execução — RLS-locked).
- `minions` + `minion_signals` (EPIC-003 — RLS-locked).

> Tabelas RLS-locked ao service role: `connector_credentials`, `jobs`,
> `workspace_context`, `minions`, `minion_signals`. Só o worker e leituras
> server-side (service role) lhes tocam — nunca o browser.

## 3. Arquitectura de IA

```
UI / server action ─▶ runtime ─▶ gateway ─▶ provider (openai|claude|perplexity|groq|deepseek)
                         │
                    classifier ─▶ routing-table ─▶ provider/modelo ideal (+ fallback)
```

- **`lib/ai/gateway`** — único ponto de contacto com qualquer LLM
  (`run()` e `stream()`). Adicionar um provider = implementar `AIProvider` e
  registar; nada mais muda.
- **`lib/ai/providers/*`** — openai, claude, perplexity, groq, deepseek. Cada um
  com `run()` e `stream()` (SSE real). Helpers partilhados em `http.ts`
  (`streamOpenAICompat`, `streamAnthropic`, `readEnv` com *overrides* de
  credenciais).
- **`lib/ai-runtime/`** — o Council:
  - `classifier` — classifica a mensagem por regras (sem LLM) num tipo de tarefa.
  - `routing-table` — tipo → provider/modelo ideal + razão.
  - `runtime.plan()` resolve provider/modelo/mensagens; `runtime.run()` executa.
    O *streaming* e o bloqueante partilham o mesmo *routing*.
- **Streaming** — `route handler` `/workspaces/[id]/chat-stream` (runtime
  `nodejs`): prepara o turno, faz stream do texto, persiste a resposta no fim, e
  envia *metadata* (tokens, fontes, próximos passos) numa linha final.
- **Custo / tokens** — `lib/ai/cost` estima custo a partir dos tokens.

## 4. Worker (Railway)

Três *loops* em paralelo (`apps/worker/worker.ts`):
1. **Jobs** — consome a fila `jobs` (execução simulada na POC; virá o Claude
   Code CLI — ADR-0002).
2. **Agente de contexto** (ADR-0004) — comprime periodicamente cada workspace
   para `workspace_context`.
3. **Minions** (EPIC-003) — corre os Minions vencidos; cada um reúne fontes →
   Claude Haiku → sinal; `approval_required` + autonomia ≥ 3 cria decisão
   pendente.

## 5. Deploy

- **Web** → Netlify (a partir de `apps/web`).
- **Worker** → Railway (a partir de `apps/worker`).
- **Base de dados** → Supabase (projecto "Atelier").

## 6. Segurança

- Porta de acesso opcional (HMAC-SHA256, cookie de sessão) quando
  `ATELIER_ACCESS_PASSWORD` está definido.
- Credenciais de conectores encriptadas em repouso (AES-256-GCM) e nunca
  devolvidas ao browser — só injectadas server-side como *overrides* de env.

## 7. ADRs e estado

| ADR | Tema | Estado |
| --- | --- | --- |
| ADR-0002 | Runtime: Council + Claude Code CLI | Proposed — Council/gateway/routing implementados; execução real do CLI por fazer |
| ADR-0003 | Interface Telegram | Proposed — não implementado |
| ADR-0004 | Chat contínuo por workspace + agente de contexto | Proposed — implementado |
| ADR-0005 | Sessões, Timeline e Chat como Interface | Proposed — Fatia 1 (projectos) implementada; Timeline/Sessões por fazer |

## 8. Implementado vs planeado

**Implementado**: workspaces + projectos, chat contínuo (Council) com routing +
streaming + fontes + próximos passos + tokens, GitHub por workspace, base de
dados por workspace, importação de contexto (single + batch), memória comprimida,
Minions (Fase 1), conectores/ecossistema, agenda ICS.

**Planeado**: pipeline de documentos (OCR → MarkItDown → índice), Timeline e
Sessões com intenção (ADR-0005 F2), execução real do Claude Code CLI (ADR-0002),
Telegram (ADR-0003), DECIM001 (knowledge graph + memória entre Spaces).

## Changelog
- v0.1 — Primeira versão da arquitectura técnica consolidada.
