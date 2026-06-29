---
id: VISION
title: Visão da Plataforma Cognitiva (DECIMA Workspace)
version: v0.1
status: Draft
owner: Inês Gavinho
created: 2026-06-29
updated: 2026-06-29
depends_on:
  - AT-0001
  - AT-0002
  - AT-0009
impacts:
  - Product
  - Development
  - Agent Architecture
---

# Visão — ATELIER como Plataforma Cognitiva

> Este documento consolida a visão completa. Estende o Manifesto
> ([AT-0001](010-philosophy/AT-0001-manifesto.md), aprovado) com o vocabulário
> concreto da plataforma. Onde algo ainda não existe, está marcado como
> **(planeado)** — ver [ARCHITECTURE.md](ARCHITECTURE.md) para o estado real.

## 1. O que é o ATELIER

O ATELIER é um **sistema operativo cognitivo** para trabalho intelectual. Não é
um chat (o chat é apenas a janela), não é um *dashboard* (não vive de métricas).
É o ambiente onde pensamento, investigação, decisão e execução coexistem — e
onde o percurso que transforma observação em conhecimento é preservado.

## 2. DECIMA — a plataforma cognitiva

**DECIMA** é o nome da plataforma cognitiva: o ambiente de trabalho onde o
conhecimento é preservado e relacionado. O ATELIER é a sua camada operativa
(a interface e os fluxos); DECIMA é a memória viva por baixo.

## 3. DECIM001 — o Cognitive Engine *(planeado)*

**DECIM001** é o motor cognitivo permanente: um processo que mantém um
*knowledge graph*, relaciona conhecimento entre Spaces e aprende continuamente
com o trabalho. É a visão de longo prazo — hoje existe a sua fundação (memória
comprimida por workspace + Minions), não o motor permanente.

## 4. Spaces, Projects, Sessions, Timeline

- **Spaces** *(planeado como conceito de topo)* — domínios de trabalho
  (PAPERS, GAVINHO, NUDO, Pessoal). Hoje, o equivalente implementado é o
  **Workspace**.
- **Projects** — unidades de trabalho dentro de um Space/Workspace. **Implementado**
  (ADR-0005 Fatia 1): cada workspace tem projectos, cada projecto tem o seu chat
  contínuo e contexto próprio.
- **Sessions** — conversas com **intenção explícita** (objectivo + skill). Hoje
  existe o chat contínuo por workspace/projecto; as sessões com intenção são a
  ADR-0005 Fatia 2 **(planeado)**.
- **Timeline** *(planeado — ADR-0005)* — todos os eventos de um projecto
  (sessões, leituras, decisões, artefactos, commits, deploys) agregados
  cronologicamente. A memória navegável do projecto.

## 5. Minions

**Minions** são *watchers* especializados que observam, organizam e propõem —
**nunca decidem sozinhos**. Cada execução produz um sinal no formato
`Signal → Evidence → Interpretation → Recommended Action → Approval Required?`.
Os sinais entram em apenas três sítios: Inbox (rever), Decisões (aprovar) ou
Timeline/Activity (registo). **Implementado** (EPIC-003 Fase 1): 6 Minions base,
com níveis de autonomia (0–5) — preparam julgamento, não o substituem.

## 6. Council

O **Council** é o parceiro de pensamento e trabalho. Escolhe o **modelo** certo
para cada tarefa (routing por tipo: pesquisa → Perplexity, código → DeepSeek,
escrita/raciocínio → Claude, brainstorming → GPT-4o, geral → Groq); o **humano**
escolhe a **intenção**. O provider é invisível e substituível. **Implementado**:
routing + streaming de respostas + fontes + próximos passos.

## 7. Pipeline de documentos *(planeado)*

`OCR → MarkItDown → chunks → Knowledge → DECIMA`. Qualquer documento (PDF,
imagem, página, leitura) entra, é normalizado para texto, segmentado, indexado e
ligado ao conhecimento existente. Hoje existe a importação de contexto de outras
IAs (texto/JSON) e as Leituras; o pipeline completo de documentos é a próxima
fase.

## 8. O modelo humano — separação sem fragmentação

O trabalho é **separado** para o utilizador (Spaces/Workspaces e Projectos dão
foco e fronteiras claras), mas **unificado** para a plataforma (DECIMA preserva e
relaciona conhecimento entre tudo). Foco no momento; continuidade no todo.

## 9. Princípio central

> **O contexto pertence ao ATELIER, não às ferramentas.**

As LLMs são motores substituíveis. A memória, as decisões e o conhecimento
pertencem à plataforma. Nada desaparece — tudo ensina a plataforma. Os detalhes
em [PRINCIPLES.md](PRINCIPLES.md).

## Changelog
- v0.1 — Primeira consolidação da visão (DECIMA / DECIM001 / Spaces / Council /
  Minions / pipeline), separando o implementado do planeado.
