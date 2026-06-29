# 060 — Decisões (ADR)

Registos de Decisões Arquitecturais (ADR — *Architecture Decision Records*). Cada decisão significativa é documentada num ficheiro próprio, numerado sequencialmente.

## Como funcionam os ADR

- Copiar `ADR-0001-template.md` para um novo ficheiro `ADR-000X-titulo.md`.
- Atribuir um `id` sequencial (`ADR-0002`, `ADR-0003`, …).
- Preencher contexto, decisão, consequências e alternativas consideradas.
- Actualizar o campo `status`: Proposed → Accepted / Rejected / Superseded.

## Conteúdo

- `ADR-0001-template.md` — Modelo de ADR (não é uma decisão real)
- `ADR-0002-runtime-execucao-council.md` — Runtime de execução: Council + Claude Code CLI (Proposed)
- `ADR-0003-interface-telegram.md` — Interface Telegram (ATELIER Mobile) (Proposed)
- `ADR-0004-chat-continuo-workspace.md` — Chat contínuo por workspace com agente de contexto (Proposed)
- `ADR-0005-sessoes-timeline-chat-interface.md` — Sessões, Timeline e Chat como Interface (Proposed)
