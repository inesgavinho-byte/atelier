---
id: ADR-0005
title: Sessões, Timeline e Chat como Interface
version: v0.1
status: Proposed
owner: Inês Gavinho
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - ADR-0002
  - ADR-0004
impacts:
  - Development
  - Agent Architecture
  - Product
---

# ADR-0005 — Sessões, Timeline e Chat como Interface

## Status
Proposed

## Context

O modelo actual trata o chat como o produto central. O ATELIER deve
inverter esta lógica: o chat é a interface, não o sistema.

A arquitectura correcta é:

Projecto → Contexto → Knowledge → Timeline → AI Runtime → Chat → Utilizador

O chat fica no fim. É a janela. Não é o destino.

O problema do chat contínuo único (ADR-0004) é que perde intenção.
Uma conversa de investigação mistura-se com uma conversa de escrita,
que se mistura com uma conversa de revisão. O histórico torna-se ruído.

A solução são Sessões com intenção explícita.

## Decision

### 1. Sessões em vez de chat único

Cada workspace tem múltiplas sessões. Cada sessão tem:
- Objectivo (string — o que se pretende alcançar)
- Skill (da Knowledge Library — ex: Investigação, Escrita, Revisão, Código)
- Provider escolhido pelo Council (automático)
- Duração (calculada — início e fim)
- Outputs (artefactos, decisões, leituras produzidas na sessão)
- Estado (activa, concluída, arquivada)

O utilizador nunca pensa "vou abrir o Claude".
Pensa "vou continuar a desenvolver o Issue 006".
O ATELIER abre automaticamente o contexto certo.

### 2. Layout do workspace

Dois painéis permanentes:

```
┌─────────────────────────────┬──────────────┐
│                             │ Contexto     │
│          CHAT               │ Leituras     │
│                             │ Decisões     │
│                             │ Artefactos   │
│                             │ Timeline     │
│                             │ Skills       │
└─────────────────────────────┴──────────────┘
```

O chat nunca desaparece mas nunca está sozinho.
O painel direito mostra o contexto vivo do projecto.

### 3. Timeline como memória

A Timeline agrega cronologicamente todos os eventos do workspace:
- Sessões de chat
- Leituras adicionadas
- Capturas
- Decisões tomadas
- Artefactos criados
- Commits e PRs (via GitHub)
- Deploys (via Netlify)

Exemplo:

```
09:10 · Leitura adicionada — "Mereologia e ontologia"
09:22 · Sessão iniciada — "Investigação de primitivas"
09:30 · Decisão — "Separar part-of de instance-of"
09:41 · Artefacto criado — "Esboço de primitivas v1"
09:55 · PR criada — "feat: primitivas de relação"
```

O chat é apenas mais um tipo de evento na Timeline.
Não é o centro — é um participante.

### 4. Contexto pertence ao Projecto, não à Sessão

Cada sessão herda o contexto completo do workspace:
- workspace_context (resumo comprimido pelo agente)
- Decisões activas
- Artefactos recentes
- Leituras relevantes
- Skills da Knowledge Library

Quando uma sessão termina, o agente de contexto (ADR-0002) processa-a
e actualiza workspace_context com o que foi produzido.

### 5. Abertura automática de contexto

Quando se abre um projecto, o ATELIER carrega automaticamente:
- A sessão activa (se existir)
- O contexto do workspace
- As leituras relevantes para a skill activa
- As decisões pendentes
- O provider mais adequado (Council decide)

O utilizador não configura nada. O sistema já sabe.

## Schema (alterações ao modelo actual)

### workspace_chats — renomear para sessions e estender

```sql
ALTER TABLE workspace_chats RENAME TO sessions;
ALTER TABLE sessions ADD COLUMN objective text;
ALTER TABLE sessions ADD COLUMN skill_id text;
ALTER TABLE sessions ADD COLUMN started_at timestamptz DEFAULT now();
ALTER TABLE sessions ADD COLUMN ended_at timestamptz;
ALTER TABLE sessions ADD COLUMN outputs jsonb DEFAULT '[]';
```

### timeline_events — nova tabela

```sql
CREATE TABLE timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id),
  kind text NOT NULL,
  -- 'chat' | 'reading' | 'capture' | 'decision' | 'artifact'
  -- | 'commit' | 'pr' | 'deploy' | 'session_start' | 'session_end'
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}',
  actor text, -- 'user' | 'council' | 'agent' | 'github' | 'netlify'
  at timestamptz DEFAULT now()
);

CREATE INDEX timeline_events_workspace_idx
  ON timeline_events(workspace_id, at DESC);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
```

## Consequences

### Positivas
- O utilizador tem intenção explícita em cada sessão
- O histórico é navegável e útil (não ruído infinito)
- A Timeline é a memória real do projecto
- O chat continua a ser a interface principal mas dentro de contexto rico
- Prepara a arquitectura para Developer Intelligence (visão futura)

### Custos / atritos
- Migração de workspace_chats → sessions (dados existentes)
- A UI do workspace precisa de ser redesenhada (sessões + timeline)
- O agente de contexto passa a processar sessões, não só mensagens

## Relation to other ADRs
- ADR-0002 (worker) — o agente de contexto processa sessões
- ADR-0003 (Telegram) — o bot pode iniciar e terminar sessões
- ADR-0004 (chat contínuo) — superseded parcialmente:
  o chat contínuo mantém-se dentro de cada sessão;
  a novidade é que as sessões têm intenção e a Timeline agrega tudo

## Depends on
- ADR-0002 (worker Railway)
- ADR-0004 (chat por workspace)

## Alternatives Considered
- Chat único infinito (ADR-0004): perde intenção e torna o histórico
  inutilizável a longo prazo
- Sessões manuais sem Timeline: resolve a intenção mas não a memória
- Chat como produto (modelo ChatGPT): o sistema não tem contexto
  persistente — cada conversa começa do zero

## Changelog
- v0.1 — Desenho inicial: sessões com intenção, Timeline como memória,
  chat como interface
