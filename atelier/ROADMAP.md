---
id: ROADMAP
title: Roadmap por Fases
version: v0.1
status: Draft
owner: Inês Gavinho
created: 2026-06-29
updated: 2026-06-29
depends_on:
  - AT-0008
  - VISION
  - ARCHITECTURE
impacts:
  - Product
  - Development
---

# Roadmap por Fases

Roadmap de **execução** — o que está em curso e o que se segue. Complementa o
roadmap conceptual fundacional [AT-0008](080-roadmap/AT-0008-roadmap.md) (as sete
fases de princípio); este é a leitura concreta do estado actual.

> Convenção: ✅ feito · 🟡 em curso · ⚪ planeado.

## Fase actual — Consolidação (em curso)

- ✅ Chat contínuo por workspace (ADR-0004)
- ✅ Council com *routing* inteligente por tipo de tarefa
- ✅ Streaming de respostas (SSE) + fontes (Perplexity) + próximos passos + tokens
- ✅ GitHub por workspace (PRs, commits, CI no painel de contexto)
- ✅ Base de dados por workspace (Supabase)
- ✅ Importação de contexto (colar / JSON + importação em batch)
- ✅ Projectos dentro de workspaces (ADR-0005 Fatia 1)
- ✅ Minions — Fase 1 (EPIC-003): 6 Minions base + worker
- 🟡 Afinação e verificação em produção (chaves de provider no ambiente)

## Próxima fase — Pipeline de conhecimento

- ⚪ Pipeline de documentos: `OCR → MarkItDown → chunks → index`
- ⚪ Biblioteca de documentos por Space/Workspace
- ⚪ Extracção de conhecimento automática (decisões, artefactos, lições)
- ⚪ Leituras como primeira classe no pipeline (não só captura)

## Fase seguinte — Timeline

- ⚪ Timeline por projecto (ADR-0005 Fatia 2)
- ⚪ Sessões com intenção explícita (objectivo + skill)
- ⚪ Todos os eventos agregados cronologicamente (sessões, leituras, decisões,
  artefactos, commits, deploys)

## Fase futura — DECIM001

- ⚪ Cognitive Engine permanente
- ⚪ *Knowledge graph*
- ⚪ Memória partilhada entre Spaces
- ⚪ Aprendizagem contínua
- ⚪ Execução real do Claude Code CLI no worker (ADR-0002)

## Fora do âmbito actual

Decisões deliberadas de **não** fazer (por agora):

- OAuth de Gmail / Google Calendar (os conectores OAuth mostram estado honesto
  "Requer OAuth"; a agenda usa feed ICS)
- Multi-utilizador (o ATELIER serve primeiro a sua utilizadora fundadora)
- *Billing* / planos
- Aplicação móvel nativa (a interface móvel é a visão ADR-0003 via Telegram)

## Changelog
- v0.1 — Primeiro roadmap de execução, alinhado com o estado real do código.
