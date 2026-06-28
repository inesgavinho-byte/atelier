---
id: ADR-0002
title: Runtime de execução — Council + Claude Code CLI
version: v0.1
status: Proposed
owner: Inês Gavinho
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - AT-0005
  - ADR-0001
impacts:
  - Development
  - Agent Architecture
---

# ADR-0002 — Runtime de execução: Council + Claude Code CLI

## Status

Proposed

## Context

O ATELIER já sabe *pensar* (chamar LLMs) mas ainda não sabe *executar trabalho*
de forma autónoma e supervisionada. A visão proposta é um ciclo:

```
ATELIER (browser)
    ↓ define tarefa
Council (LLMs) — planeia e divide em passos
    ↓ gera prompt
API Route (trigger)
    ↓ enfileira job
Worker persistente com Claude Code CLI (subprocess, sandbox)
    ↓ executa `claude -p "prompt"`
    ↓ devolve output + artefactos
Council — analisa resultado
    ↓ gera 2–3 propostas para o próximo passo
Inês — revê e aprova no ATELIER
    ↓ loop repete
```

São **duas capacidades distintas**, que não se devem confundir:

1. **Completions** (já existe): `lib/ai/gateway.ts` — chamadas sem estado a
   LLMs (chat, síntese). Provider-agnostic, segredos no servidor.
2. **Execução** (novo): correr o **Claude Code CLI** como subprocesso, com
   *workspace*, a ler/escrever ficheiros e a correr comandos em vários passos.
   Produz artefactos e demora segundos a minutos.

O que já temos e deve ser reutilizado, **sem inventar padrão novo**:

- **Council** → assenta em `lib/ai-runtime/` (work modes → Skills,
  context-builder) por cima do `gateway`. Planear e criticar são `runtime.run()`
  com Skills diferentes. Continua provider-agnostic (Princípio: nunca depender
  de um LLM específico).
- **Aprovação humana** → a superfície de **Decisões** (`decisions`). Cada
  conjunto de "2–3 propostas" é um item aprovável.
- **Segredos no servidor** → a chave Anthropic vive no worker; o ATELIER nunca a
  vê (coerente com o store de credenciais e a Fase 3).
- **Porta de acesso** (Fase 3) à frente de todo o sistema.

## Decision

Adotar um modelo de **fila de trabalhos com worker persistente e isolado**, em
vez da chamada síncrona implícita no diagrama original.

### Porque não a seta síncrona `API Route → CC CLI`

1. **Edge/Functions não correm subprocessos.** As Netlify Functions (Lambda)
   são efémeras e curtas e têm filesystem efémero; as Edge Functions (Deno) nem
   subprocesso permitem. Nenhuma consegue hospedar o `claude -p` com workspace.
2. **As execuções são longas.** Pedido/resposta não serve; é preciso estado.

### Arquitectura

```
Browser → API Route (Next) → INSERT em `jobs` (estado: queued)
Worker persistente (fora do Netlify) → poll/realtime de `jobs`
   → para cada job: workspace isolado e descartável (container/worktree)
   → corre `claude -p` com tools allowlisted e egress controlado
   → escreve output + artefactos + estado (running → done/error) no Supabase
Browser ← Supabase realtime/poll (estado, output, propostas)
Council (runtime/gateway) → lê o resultado → gera 2–3 propostas → cria Decisão
Inês aprova → a aprovação enfileira o próximo job
```

- **Trigger**: route handler do Next (`app/api/.../route.ts`) que valida e faz
  `INSERT` na tabela `jobs`. Nada de execução aqui.
- **Worker**: host persistente e isolado (ex.: Fly.io machine / Railway /
  Render worker / VM pequena) com o CC CLI instalado e a chave. Faz o trabalho
  real. Autentica-se ao Supabase via service role.
- **Estado e transporte**: tabela `jobs` no Supabase (contrato abaixo); o
  browser observa por realtime/poll.
- **Council**: reutiliza `ai-runtime` + `gateway`; corre no servidor (route ou
  worker), nunca no browser.
- **Aprovação**: cada passo proposto vira uma Decisão; aprovar enfileira o job
  seguinte. O ciclo só avança com o humano.

### Contrato de dados (proposta — `jobs`)

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | PK |
| `task_id` | text | a tarefa-mãe definida no ATELIER |
| `step` | int | índice do passo no plano |
| `status` | text | `queued` / `running` / `done` / `error` / `cancelled` |
| `prompt` | text | prompt gerado pelo Council para o CC CLI |
| `workspace` | text | identificador do workspace isolado |
| `output` | text | resultado bruto do `claude -p` |
| `artifacts` | jsonb | caminhos/refs de artefactos produzidos |
| `error` | text | mensagem quando `status=error` |
| `approved_by` | text | quem aprovou (gate humano) |
| `created_at` / `updated_at` | timestamptz | |

RLS fechada ao service role, como `connector_credentials`.

## Consequences

**Positivas**

- Reutiliza tudo o que já existe (gateway, runtime, decisões, gate); a peça
  genuinamente nova é o worker.
- Provider-agnostic preservado: o Council escolhe o LLM via gateway; só a
  *execução* está atada ao CC CLI (que é a ferramenta, não o cérebro).
- Estado durável e auditável (a tabela `jobs` é o histórico).

**Custos / atritos**

- Introduz **infra fora do Netlify** (o worker), que é preciso operar e pagar.
- Latência assíncrona: a UI passa a ser orientada a estado, não a respostas
  imediatas.

**Riscos que moldam o desenho** (decidir antes de construir)

1. **É, na prática, RCE-as-a-service.** O `claude -p` executa código no
   workspace. Mitigação: sandbox por job (container/worktree descartável), sem
   acesso a segredos que não precise, egress allowlisted, sem credenciais de
   produção montadas.
2. **Prompt-injection vinda do próprio Council.** O prompt que chega ao CLI é
   gerado por LLMs; uma fonte envenenada pode dirigir a execução. Mitigação:
   aprovação humana antes de passos destrutivos, tools allowlisted, e separação
   clara entre "ler/propor" e "escrever/executar".
3. **Loops e custo.** Mitigação: limite de passos por tarefa, orçamento de
   tokens/tempo, e o gate de aprovação a cada iteração (já no ciclo).

## Alternatives Considered

- **Chamada síncrona API Route → CC CLI** (diagrama original). Rejeitada: as
  funções serverless não correm subprocessos longos nem mantêm workspace.
- **Tudo serverless (sem worker dedicado)**. Rejeitada pela mesma razão; no
  máximo serviria para o Council (completions), nunca para a execução.
- **Executar no browser / no próprio app Next**. Rejeitada: segredos no cliente
  e sem isolamento — viola os princípios já estabelecidos.

## Related Documents

- AT-0005 — Arquitetura de Agentes
- ADR-0001 — Template
- `apps/web/src/lib/ai/gateway.ts`, `apps/web/src/lib/ai-runtime/`
- SECURITY.md — porta de acesso e RLS

## Changelog

- v0.1 — Proposta inicial: fila de jobs + worker isolado; ciclo Council →
  execução → propostas → aprovação; contrato `jobs`; riscos e travões.
