# 060 — Decisões (ADR)

Registos de Decisões Arquitecturais (ADR — *Architecture Decision Records*). Cada decisão significativa é documentada num ficheiro próprio, numerado sequencialmente.

## Como funcionam os ADR

- Copiar `ADR-0001-template.md` para um novo ficheiro `ADR-000X-titulo.md`.
- Atribuir um `id` sequencial (`ADR-0002`, `ADR-0003`, …).
- Preencher contexto, decisão, consequências e alternativas consideradas.
- Actualizar o campo `status`: Proposed → Accepted / Rejected / Superseded.

## Conteúdo

O campo `status` é o do próprio ADR; a coluna *Implementação* indica o que já
existe no código (o estado real pode estar à frente do `status` formal).

| ADR | Título | Status | Implementação |
| --- | --- | --- | --- |
| `ADR-0001-template.md` | Modelo de ADR (não é uma decisão real) | — | — |
| `ADR-0002-runtime-execucao-council.md` | Runtime de execução: Council + Claude Code CLI | Proposed | Parcial — Council/gateway/routing/worker implementados; execução real do CLI por fazer |
| `ADR-0003-interface-telegram.md` | Interface Telegram (ATELIER Mobile) | Proposed | Implementado (bot no worker: comandos, captura, aprovação de decisões, notificações) |
| `ADR-0004-chat-continuo-workspace.md` | Chat contínuo por workspace com agente de contexto | Proposed | Implementado (chat contínuo, streaming, agente de contexto no worker) |
| `ADR-0005-sessoes-timeline-chat-interface.md` | Sessões, Timeline e Chat como Interface | Proposed | Fatia 1 (projectos) + Timeline + Sessões v1 (intenção/skill/estado, eventos na Timeline) implementadas; routing do chat por sessão por fazer |
| `ADR-0006-personal-decimin-conversation-watch.md` | Personal Decimin & Conversation Watch | Proposed | Em curso — Conversation Watch v1 (grupos Telegram, itens pendentes, briefing diário) |
