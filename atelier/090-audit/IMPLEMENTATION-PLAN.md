---
title: Plano de conclusão de implementação — ATELIER / DECIMA
date: 2026-06-30
status: plano
---

# Plano de conclusão de implementação

> O que falta para cada ADR e cada conceito da visão estar 100% implementado.
> Esforço: **S** (≤1 dia) · **M** (2–4 dias) · **L** (1–2 semanas) · **XL** (>2 semanas).
> Impacto medido contra o critério de sucesso da visão (aumentar qualidade de
> decisão, preservar conhecimento, reduzir trabalho repetitivo, reduzir carga
> cognitiva, preservar continuidade).
> Ver estado actual em `AUDIT-2026-06-30.md`.

## Prioridade global (ordem recomendada)

1. **P0 — Embeddings em pgvector** (M) — desbloqueia RAG a escala e é pré-requisito de quase tudo
2. **P0 — Runtime de execução real (ADR-0002)** (XL) — o maior fosso entre visão e código
3. **P1 — Living Artifacts: revisões reais + 1 conector Google** (L→XL)
4. **P1 — Cognitive Load (Personal Decimin v2)** (M)
5. **P2 — Pattern Decimin real** (L)
6. **P2 — Mission Engine contínuo (Evidência/Confiança/Dependências/Impacto)** (L)
7. **P3 — RLS real + ownership** (XL) — detalhado em `SCALABILITY-MULTITENANT.md`

---

## ADR-0002 — Runtime de execução (Council + Claude Code CLI)

**Hoje:** fila `jobs` atómica + execução **simulada** (`worker.ts:66`). ❌

| Falta | Esforço | Impacto |
|---|---|---|
| Substituir o `sleep`+mock por subprocess real (Claude Code CLI ou agente headless) com captura de stdout/stderr e exit code | **L** | Alto — torna o ADR real |
| Isolamento por job: worktree git por job / container efémero; allowlist de tools; sem traversal fora do workspace | **L** | Alto (segurança) |
| Recolha de artefactos para `jobs.artifacts` (diffs, ficheiros, logs) — colunas já existem mas nunca populadas | **M** | Médio |
| Gate de aprovação humana por step (Council propõe → humano aprova → executa) — ligar ao fluxo de decisões existente | **M** | Alto (doutrina: nada executa sem explicação) |
| Retry com backoff + dead-letter (hoje não há) | **S** | Médio |
| Streaming do progresso do job para a UI `/jobs` (hoje só estado final) | **M** | Médio |

**Definição de pronto:** um job enfileirado corre um agente isolado, produz
artefactos versionados, requer aprovação por step, e a UI mostra progresso e
permite aprovar/rejeitar.

---

## ADR-0006 — Personal Decimin v2

**Hoje:** Watch ✅, Briefing ✅, Shadow Mode ✅ (só Telegram), Confidence ✅ (só
Telegram). Falta o pilar Cognitive Load e generalizar Shadow/Confidence.

| Falta | Esforço | Impacto |
|---|---|---|
| **Cognitive Load** — calcular e expor "Conversas abertas / Compromissos pendentes / Decisões à espera / Carga actual" + recomendação ("fecha 3 loops antes de começar algo novo"). Deriva de `decisions`, `telegram_pending_items`, `captures`, `workspace_messages` | **M** | Alto (reduzir carga cognitiva é gate da visão) |
| Generalizar **Shadow Mode** a todas as capacidades (minions ainda não o respeitam — só Telegram) | **M** | Médio (confiança) |
| **Confidence** visível na UI (`/pending`) com o `confidence_reason`, não só no ranking do briefing | **S** | Médio |
| Pending Intelligence além do Telegram (email/calendário quando existirem conectores) | **L** | Alto (depende de OAuth) |
| Modos operacionais (Deep Work, Creative, Execution, Meetings, Travel) a adaptar comportamento | **L** | Médio |

**Definição de pronto:** dashboard de carga cognitiva com recomendação; toda
capacidade nova arranca em Shadow; confiança e razão visíveis onde o item aparece.

---

## Visão — Mission Engine

**Hoje:** `/mission` mostra contagens estáticas. ⚠️

| Falta | Esforço | Impacto |
|---|---|---|
| Modelo de estado contínuo por missão/projecto: progresso, risco, dependências, confiança, "futuro provável" — recalculado pelo agente de contexto (já corre de hora a hora) | **L** | Alto |
| Cada recomendação expõe **Evidência · Confiança · Dependências · Impacto** (princípio de design — nada aparece sem explicação) | **M** | Alto |
| Sinais de risco automáticos ("weak signals become tomorrow's crises") a partir de objectivos parados, decisões pendentes há muito, etc. | **M** | Médio |

**Definição de pronto:** `/mission` lê um estado vivo por workspace, com cada
alerta/recomendação acompanhado de evidência e confiança.

---

## Visão — Living Artifacts

**Hoje:** `artifacts` (7 rows), `artifact_revisions` **0 rows** (nunca usado), sem
Google Workspace. ⚠️/❌

| Falta | Esforço | Impacto |
|---|---|---|
| Exercitar revisões reais: cada edição de artefacto cria `artifact_revision` (snapshot + diff + autor); UI de histórico/restore | **M** | Alto (identidade permanente do artefacto) |
| Pipeline canónico ponta-a-ponta: ficheiro original → storage permanente → MarkItDown → **Markdown canónico** → chunking → extração de conhecimento → biblioteca (peças isoladas existem; o fio condutor não) | **L** | Alto |
| **Integração Google Workspace** (Docs/Sheets/Slides) — editar o documento colaborativo canónico, não gerar ficheiros descartáveis. **Dependência crítica e inexistente** (ver `THIRD-PARTY-INTEGRATIONS.md`) | **XL** | Muito alto |
| Templates que definem estrutura; LLM preenche conteúdo | **M** | Médio |

**Definição de pronto:** um artefacto vive como objecto permanente com revisões
navegáveis; pelo menos Google Docs editável a partir do ATELIER.

---

## Visão — Pattern Decimin

**Hoje:** minion `pattern` corre Haiku com prompt genérico; sem análise
transversal. ❌ (o mais valioso, o menos maduro)

| Falta | Esforço | Impacto |
|---|---|---|
| Entrada transversal real: dar ao minion sinais de **todos** os Spaces (decisões, sinais Telegram, actividade, leituras) num único contexto | **M** | Alto |
| Deteção de relações: falhas repetidas, comportamento de fornecedores, dependências escondidas, oportunidades recorrentes, semelhanças inesperadas | **L** | Muito alto |
| Output como cartões de padrão com evidência ("isto aconteceu 3× em 2 Spaces") em vez de texto livre | **M** | Alto |
| Embeddings transversais (cross-Space) para encontrar semelhança — depende de pgvector | **M** | Alto |

**Definição de pronto:** Pattern Decimin produz padrões accionáveis com evidência,
cruzando ≥2 Spaces, e não apenas resumos por Space.

---

## Infra-estrutura transversal (habilita o resto)

| Item | Esforço | Impacto | Porquê primeiro |
|---|---|---|---|
| **Embeddings → pgvector** + índice ivfflat/hnsw; migrar `document_chunks.embedding` JSONB→`vector(1536)`; substituir cosseno em-processo por `<=>` no SQL | **M** | Muito alto | Pré-requisito de RAG a escala, Pattern Decimin e pesquisa transversal |
| Índices nas FKs (`workspace_id`, `project_id`, `agent_id`) | **S** | Médio | Barato, evita scans quando os dados crescerem |
| Suite de testes mínima (gateway/routing, parsing de import, chunking, RAG) | **M** | Médio | 0 testes hoje; protege o laço central |
| Config externa para routing/fallback do Council (incluir Groq/DeepSeek no fallback) | **S** | Médio | Remove hardcode; melhor custo/resiliência |

---

## Sequenciamento sugerido (trimestre)

- **Sprint 1:** pgvector + índices FK (P0 infra) · Cognitive Load (P1) · Confidence/Shadow na UI.
- **Sprint 2:** Runtime de execução real ADR-0002 (subprocess isolado + artefactos + aprovação).
- **Sprint 3:** Living Artifacts revisões reais + primeiro conector Google (Docs) · Mission Engine contínuo.
- **Sprint 4:** Pattern Decimin transversal · testes · preparação multi-tenant (ver doc 4).
