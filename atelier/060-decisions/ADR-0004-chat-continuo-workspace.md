---
id: ADR-0004
title: Chat contínuo por workspace com agente de contexto
version: v0.1
status: Proposed
owner: Inês Gavinho
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - ADR-0002
  - ADR-0003
impacts:
  - Development
  - Agent Architecture
---

# ADR-0004 — Chat contínuo por workspace com agente de contexto

## Status

Proposed

## Context

O modelo actual de chats (sessões separadas, utilizadora escolhe modelo) não
reflecte a visão do ATELIER. A utilizadora não quer gerir sessões nem escolher
modelos — quer uma conversa contínua por workspace que nunca esquece.

## Decision

### 1. Um chat contínuo por workspace

Cada workspace tem exactamente uma conversa activa com a IA. Não há sessões
separadas nem histórico de chats a gerir. A interface é uma janela de chat
simples — como o Claude.ai — sem formulários de configuração nem selecção de
modelo.

### 2. O Council escolhe o modelo

A utilizadora nunca escolhe o provider ou modelo. O Council
(`lib/ai-runtime` + gateway) decide automaticamente qual o modelo mais
adequado para cada mensagem, com base no tipo de pedido e custo.
Provider-agnostic: a conversa não está atada a nenhum LLM específico.

### 3. Agente de contexto — corre a cada hora

Um agente especializado corre automaticamente a cada hora de trabalho activo.
Função exclusiva: manter o contexto do workspace comprimido e actualizado.

O que o agente faz a cada hora:

- Lê as mensagens da última hora de conversa.
- Extrai: decisões, artefactos, código produzido, lições aprendidas, estado do
  projecto.
- Actualiza o contexto global do workspace na tabela `workspace_context`
  (Supabase).
- O system prompt do chat inclui sempre o contexto comprimido mais recente.

O resultado: o chat nunca esquece, mesmo quando a conversa é longa. O contexto
não é a conversa inteira — é o extracto inteligente produzido pelo agente.

### 4. Contexto global do ATELIER

Para além do contexto por workspace, existe um contexto global:

- Decisões aprovadas (tabela `decisions`).
- Artefactos produzidos (tabela `artifacts`).
- Lições aprendidas extraídas pelo agente.
- Padrões identificados entre workspaces.

Este contexto global é injectado no system prompt de qualquer chat.

## Arquitectura

### Tabelas novas/modificadas

- `workspace_context`: `id`, `workspace_id`, `summary` (text), `decisions`
  (jsonb), `artifacts` (jsonb), `lessons` (jsonb), `last_updated_at`,
  `version`.
- `workspace_messages`: adicionar campo `context_version` (para saber com que
  versão de contexto cada mensagem foi enviada).
- Remover: `workspace_chats` (substituído pelo modelo de chat único por
  workspace) e `workspace_projects` (simplificar — projectos vivem como
  artefactos).

### Interface de chat

- `/workspaces/[id]` mostra directamente o chat contínuo.
- Janela de chat idêntica ao Claude.ai: mensagens em scroll, input em baixo.
- Sem selecção de modelo, sem configuração de sessão.
- Header simples: nome do workspace + estado do agente de contexto.

### Agente de contexto no worker Railway (ADR-0002)

- Corre a cada hora via `setInterval` ou cron job no worker.
- É um job especial na tabela `jobs` (`kind: 'context-update'`,
  `workspace_id`).
- Usa o Council (runtime/gateway) para resumir e extrair.
- Escreve o resultado em `workspace_context`.
- Notifica via Telegram quando o contexto é actualizado (ADR-0003).

### System prompt dinâmico

Cada mensagem enviada ao LLM inclui:

1. Princípios e Mental Models da Knowledge Library (já existe).
2. Contexto global do ATELIER (decisions + artifacts recentes).
3. Contexto comprimido do workspace (`workspace_context` mais recente).
4. Últimas N mensagens da conversa (janela deslizante).

## Consequences

### Positivas

- Experiência simples: 1 workspace = 1 conversa = sem fricção.
- Memória persistente sem limite prático de contexto.
- Council optimiza custo automaticamente — utilizadora não pensa em modelos.
- O agente de contexto é reutilizável para outros workspaces.

### Custos / atritos

- Migração necessária: `workspace_chats` e `workspace_projects` têm de ser
  simplificados.
- O agente de contexto tem custo de tokens a cada hora (estimativa:
  ~$0.01–0.05/hora por workspace activo).
- Sistema mais complexo que sessões simples — mas esconde essa complexidade da
  utilizadora.

## Dependências

- **ADR-0002** (worker Railway) — o agente corre como job no worker.
- **ADR-0003** (Telegram) — notificações de actualização de contexto.
- `lib/ai-runtime` + gateway — o agente usa o Council para resumir.

## Alternatives Considered

- **Manter sessões separadas + selecção de modelo** (modelo actual). Rejeitado:
  expõe gestão e escolha de modelo que a utilizadora não quer fazer.
- **Enviar a conversa inteira como contexto** (sem agente de compressão).
  Rejeitado: cresce sem limite, fica caro e bate no limite de contexto.

## Related Documents

- ADR-0002 — Runtime de execução: Council + Claude Code CLI
- ADR-0003 — Notificações via Telegram
- `apps/web/src/lib/ai-runtime/`, `apps/web/src/lib/ai/gateway.ts`

## Changelog

- v0.1 — Desenho inicial.
