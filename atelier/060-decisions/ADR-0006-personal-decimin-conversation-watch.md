---
id: ADR-0006
title: Personal Decimin & Conversation Watch
version: v0.1
status: Proposed
owner: Inês Gavinho
created: 2026-06-29
updated: 2026-06-29
depends_on:
  - ADR-0003
  - ADR-0002
impacts:
  - Development
  - Agent Architecture
  - Personal Workflow
---

# ADR-0006 — Personal Decimin & Conversation Watch

## Status

Proposed

## Context

ADR-0003 defines the Telegram bot as a mobile interface for the ATELIER.
The Personal Decimin is the evolution of that bot — not a separate system.

Telegram is the first channel of the Personal Decimin.

The Personal Decimin is a personal cognitive companion that ensures nothing important disappears across conversations, groups, commitments and channels.

It belongs to the user. Work produced inside a Space belongs to the Space. Knowledge extracted belongs to DECIMA.

## Decision

Implement Conversation Watch as the first capability of the existing Telegram bot (ADR-0003), running in the apps/worker Railway service (ADR-0002).

### Scope v1

- Observe only Telegram groups where the bot is explicitly added
- Parse messages for: requests, commitments, promised files, deadlines, unanswered questions
- Create pending items in the database
- Route each item to Personal Inbox or the relevant Space/Project when detectable
- Send a daily pending briefing to Inês via Telegram
- No automatic replies
- No invisible monitoring
- No meeting microphone or listening

### Schema

#### telegram_groups
```sql
CREATE TABLE telegram_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id bigint UNIQUE NOT NULL,
  title text NOT NULL,
  workspace_id uuid REFERENCES workspaces(id),
  project_id uuid REFERENCES workspace_projects(id),
  autonomy_level integer NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

#### telegram_pending_items
```sql
CREATE TABLE telegram_pending_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES telegram_groups(id),
  workspace_id uuid REFERENCES workspaces(id),
  kind text NOT NULL,
  -- 'request' | 'commitment' | 'promised_file' | 'deadline' | 'unanswered_question' | 'decision' | 'risk'
  description text NOT NULL,
  from_person text,
  to_person text,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'resolved' | 'dismissed'
  source_message_id bigint,
  source_message_text text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
```

### Processing pipeline
```
Telegram group message received
  ↓
Worker: process_telegram_message()
  ↓
Claude Haiku analyses message:
  - Is there a request? Who made it? To whom?
  - Is there a commitment? Deadline?
  - Is there a promised file not yet delivered?
  - Is there an unanswered question?
  ↓
If signal detected:
  → INSERT into telegram_pending_items
  → Route to workspace/project if detectable
  → Add to Personal Inbox (captures table)
  ↓
Daily briefing (09:00 Lisboa time):
  → Collect all pending items (status='pending')
  → Format as Telegram message to Inês
  → "Tens N pedidos sem resposta: ..."
```

### Routing logic

If a group has workspace_id set → items route to that workspace.
If not → items route to Personal Inbox (captures with kind='pending').
The user can manually link groups to workspaces via ATELIER settings.

### Daily briefing format
```
📋 Resumo diário — N pedidos pendentes

GAVINHO:
  - Orçamento Novibelo — pedido há 3 dias (João)
  - Confirmação de entrega — pendente (Supplier X)

DECIMA:
  - PR #23 por rever — pendente (team)

Personal:
  - Escola — confirmação pendente

Para ver todos: [link para /inbox no ATELIER]
```

### Privacy

- Bot only active in groups where explicitly added
- Bot presence always visible (it is a named bot, not a shadow listener)
- No audio/video capture in v1
- All data stored in Supabase under service role (encrypted at rest)

## Consequences

### Positivas
- Prevents important commitments from disappearing in group conversations
- Routes signals to the right Space automatically
- Daily briefing replaces manual scanning of multiple groups
- Builds on existing infrastructure (ADR-0002, ADR-0003)

### Custos / atritos
- Requires Claude Haiku call per message in observed groups (cost: ~$0.001/message)
- Privacy must be explicit — bot must be visibly present
- False positives possible — user can dismiss items

## Alternatives Considered

- Manual logging: rejected — too much friction, things still disappear
- Full autonomy (auto-reply): rejected — v1 must not reply without approval
- Separate system from Telegram bot: rejected — same infrastructure, same worker

## Depends on
- ADR-0002 (worker Railway)
- ADR-0003 (Telegram bot)
- apps/worker/worker.ts (existing Telegram loop)

## Changelog
- v0.1 — Initial design: Conversation Watch v1 scope, schema, pipeline, daily briefing
