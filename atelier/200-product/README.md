# 200 — Produto (Backlog de Implementação)

Este directório representa o **backlog de implementação** do ATELIER. É **separado dos documentos constitucionais** (`atelier/000`–`100`): a Constituição define o que o sistema é e porquê; o backlog define o trabalho concreto a construir.

Toda a implementação deverá respeitar a Constituição (ver, em particular, `040-product/AT-0004-product-specification.md` e `080-roadmap/AT-0008-roadmap.md`).

## Estrutura

```
200-product/
├── README.md
├── epics/        EPIC-000X — grandes frentes de trabalho
├── features/     FEAT-000X — funcionalidades
├── stories/      STORY-000X — histórias de utilizador
└── tasks/        TASK-000X — tarefas de implementação
```

## Hierarquia

```
Epic
↓
Feature
↓
Story
↓
Task
```

## Identificação

- **EPIC-000X** — épicos
- **FEAT-000X** — funcionalidades
- **STORY-000X** — histórias
- **TASK-000X** — tarefas

Cada documento começa com o bloco de metadados padrão (`id`, `title`, `version`, `status`, `owner`, `created`, `updated`, `depends_on`, `impacts`). Os ficheiros Markdown são a fonte de verdade única; a Biblioteca de Produto da aplicação (`/product`) renderiza-os directamente.

## Conteúdo actual

- `epics/EPIC-001-mission-control.md` — Mission Control
