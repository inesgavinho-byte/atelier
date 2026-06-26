# ATELIER

**Onde o pensamento se torna trabalho.**

O ATELIER é a camada operativa para os projectos intelectuais, editoriais e estratégicos de Inês Gavinho. Não é um gestor de tarefas, nem um *dashboard*, nem um CRM, nem uma aplicação de conversação — é um espaço de trabalho digital onde as ideias se tornam trabalho.

Este repositório é o **Repositório Fundacional do ATELIER**: a fonte de verdade tanto para o **código do produto** como para a **filosofia do produto**.

---

## O que é o ATELIER

O princípio é simples:

> Os agentes trabalham. A Inês julga. A interface mostra apenas o que exige atenção, decisão ou direcção.

PAPERS é o primeiro espaço de trabalho-piloto; o ATELIER é uma camada operativa geral, concebida para coordenar vários projectos (PAPERS, DECIMA, GAVINHO, NUDO, Pessoal) e, eventualmente, vários agentes de IA.

---

## Estrutura do repositório

```
ATELIER/
├── README.md              Este documento
├── package.json           Raiz do monorepo (workspaces + scripts delegados)
├── apps/
│   └── web/               Aplicação Next.js (o produto)
├── packages/              Pacotes partilhados (vazio por agora)
├── atelier/               Fundação intelectual (filosofia, decisões, ontologia)
│   ├── 000-canon/
│   ├── 010-philosophy/
│   ├── 020-operating-system/
│   ├── 030-organisation/
│   ├── 040-product/
│   ├── 050-agent-architecture/
│   ├── 060-decisions/
│   ├── 070-research/
│   ├── 080-roadmap/
│   ├── 090-goals/
│   └── 100-ontology/
├── assets/                Recursos partilhados (vazio por agora)
└── scripts/               Scripts de automação (vazio por agora)
```

### Diferença entre `/apps/web` e `/atelier`

- **`/apps/web`** — o **código** do produto. A aplicação Next.js que se constrói, testa e implementa.
- **`/atelier`** — o **pensamento** do produto. A fundação intelectual: filosofia, organização, decisões arquitecturais, roteiro, objectivos e ontologia.

Esta separação é intencional: o ATELIER não deve evoluir como uma colecção de ecrãs desconexos. O código e a filosofia evoluem lado a lado, com a mesma durabilidade.

---

## Como executar a aplicação web

O repositório está organizado como um monorepo com *workspaces* npm. Os scripts da raiz delegam no *workspace* `@atelier/web`, pelo que **todos os comandos podem ser executados a partir da raiz**:

```bash
npm install      # instala dependências de todos os workspaces
npm run dev      # arranca o servidor de desenvolvimento (http://localhost:3000)
npm run build    # build de produção
npm run start    # serve o build de produção
npm run typecheck
npm run lint
```

Em alternativa, é possível executar directamente dentro de `apps/web` (ver `apps/web/README.md`).

---

## Como os documentos são identificados

Toda a documentação vive em `atelier/`, organizada por gabinetes numerados. Cada documento começa com um bloco de metadados e usa um identificador estável:

- **AT-000X** — documentos da fundação (ex.: `AT-0001` Manifesto, `AT-0009` Ontologia).
- **ADR-000X** — Registos de Decisões Arquitecturais.
- **GOAL-000X** — Objectivos.

Bloco de metadados padrão no topo de cada documento:

```
---
id: AT-000X
title: Título do Documento
version: v0.1
status: Draft
owner: Inês Gavinho
created: 2026-06-26
updated: 2026-06-26
depends_on: []
impacts: []
---
```

Seguido das secções: **Propósito**, **Âmbito**, **Estado** e **Registo de alterações**.

### Como funcionam os ADR

Um ADR (*Architecture Decision Record*) documenta uma decisão arquitectural significativa. Para criar um:

1. Copiar `atelier/060-decisions/ADR-0001-template.md`.
2. Atribuir um `id` sequencial (`ADR-0002`, `ADR-0003`, …) e um título.
3. Preencher: **Status**, **Context**, **Decision**, **Consequences**, **Alternatives Considered**, **Related Documents**, **Changelog**.
4. Actualizar o `status`: Proposed → Accepted / Rejected / Superseded.

### Como funcionam os objectivos

Um objectivo (*goal*) define uma intenção com critérios de sucesso. Vivem em `atelier/090-goals/`, com `id` sequencial (`GOAL-0001`, …) e um campo `impacts` que lista os documentos afectados. O `status` indica o estado: Active, Done, Paused ou Dropped.

---

## Estado de desenvolvimento actual

- **Sprint 001** — MVP da camada operativa (rotas, interface editorial, dados *mock* tipados, arquitectura pronta para Supabase). Concluído.
- **Sprint A001** — Reestruturação fundacional do repositório (este trabalho): aplicação movida para `apps/web`, fundação intelectual criada em `atelier/`. Em curso.

O objectivo activo é o `GOAL-0001 — Construir a Fundação ATELIER`.

---

## Língua

Toda a documentação está em **Português Europeu**. A interface da aplicação será eventualmente traduzida para português, mas essa tradução não faz parte deste sprint.
