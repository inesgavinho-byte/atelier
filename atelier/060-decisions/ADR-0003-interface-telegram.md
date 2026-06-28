---
id: ADR-0003
title: Interface Telegram (ATELIER Mobile)
version: v0.1
status: Proposed
owner: Inês Gavinho
created: 2026-06-28
updated: 2026-06-28
depends_on:
  - ADR-0002
impacts:
  - Development
  - Agent Architecture
---

# ADR-0003 — Interface Telegram (ATELIER Mobile)

## Status
Proposed

## Context
O ATELIER precisa de uma interface móvel para desbloqueio rápido de trabalho
em contextos sem computador (deslocações, etc). O Telegram é o canal escolhido
por ser leve, ter API robusta e suportar notificações proactivas.

## Decision
Construir um bot Telegram como cliente adicional do ATELIER — não uma app separada.
Lê e escreve nas mesmas tabelas (jobs, decisions, readings) via Supabase.
Corre como segundo processo no worker Railway (ADR-0002), não como infra nova.

### Modo reactivo (utilizadora escreve)
- Ver compromissos do dia ("o que tenho hoje?")
- Marcar reuniões por linguagem natural ("marca reunião com João amanhã às 15h")
- Ver decisões pendentes ("que decisões tenho?")
- Aprovar uma proposta do Council ("aprovo a opção 2")
- Ver estado dos jobs ("o que está a correr?")

### Modo proactivo (bot notifica sem pedido)
- Reunião em X minutos
- Job concluído → proposta do Council pronta para aprovar
- Decisão nova pendente
- Job com erro (precisa de atenção)

## Architecture
- Bot Telegram: segundo loop no worker Railway (ADR-0002) — mesma infra
- Linguagem natural → Council (ai-runtime/gateway) interpreta e age
- Calendário: lê da tabela jobs + feed ICS (já existe em lib/agenda.ts)
- Decisões: lê/escreve em decisions (já existe)
- Notificações proactivas: poll a cada N segundos no worker, dispara via Telegram Bot API

## Consequences

### Positivas
- Zero infra nova — o worker Railway já existe
- Interface móvel sem app nativa
- Desbloqueio de trabalho em qualquer sítio

### Custos / atritos
- Aprovações via Telegram têm de ser autenticadas (só a dona da conta aprova)
- Linguagem natural mal interpretada pode enfileirar jobs indesejados

## Risks
- Autenticação: o bot tem de verificar que só a utilizadora autorizada aprova decisões
- Interpretação errada de linguagem natural → gate de confirmação antes de agir

## Alternatives Considered
- App móvel nativa: rejeitada — custo de desenvolvimento desproporcional
- PWA: rejeitada — notificações proactivas são limitadas em iOS
- WhatsApp Business API: rejeitada — mais cara e mais restritiva que Telegram

## Depends on
- ADR-0002 (worker Railway)
- Fase 3 (autenticação — o bot usa service role, nunca anon key)
- lib/agenda.ts (calendário ICS)
- lib/ai-runtime + gateway (linguagem natural)

## Changelog
- v0.1 — Desenho inicial
