---
title: Melhorias de ROI elevado — ATELIER / DECIMA
date: 2026-06-30
status: plano
---

# Melhorias de ROI elevado

> 15 melhorias concretas ordenadas por ROI (impacto / esforço). Foco em **polish
> do que já existe**, em **aproveitar infra subutilizada** e em **corrigir
> inconsistências reais** — não features novas. Esforço: S (≤1d) · M (2–4d) · L (1–2sem).

## Tabela-resumo (ordenada por ROI)

| # | Melhoria | Impacto | Esforço | Risco |
|---|---|---|---|---|
| 1 | Embeddings em pgvector | Alto | M | Baixo |
| 2 | Groq/DeepSeek no fallback do Council | Médio-alto | S | Baixo |
| 3 | Índices nas FKs | Médio | S | Muito baixo |
| 4 | Cognitive Load no `/pending` | Alto | M | Baixo |
| 5 | Confidence + razão visíveis na UI | Médio | S | Muito baixo |
| 6 | Cache GitHub/Netlify partilhada (tabela) | Médio | S | Baixo |
| 7 | Retry/backoff nas chamadas LLM e embeddings | Médio | S | Baixo |
| 8 | Chunking consciente de estrutura | Médio | M | Baixo |
| 9 | RAG transversal opcional (cross-Space) | Alto | M | Médio |
| 10 | Pesquisa global (⌘K) sobre tudo | Alto | M | Baixo |
| 11 | Shadow Mode em todos os minions | Médio | M | Baixo |
| 12 | Suite de testes do laço central | Médio | M | Baixo |
| 13 | Custo/tokens por turno visível | Médio | S | Muito baixo |
| 14 | Dedupe/idempotência de import e timeline | Médio | S | Baixo |
| 15 | Health do ecossistema na home | Baixo-médio | S | Muito baixo |

---

## Detalhe

### 1. Embeddings em pgvector — **ROI máximo**
- **O quê:** migrar `document_chunks.embedding` de JSONB para `vector(1536)`, criar
  índice HNSW/ivfflat, e substituir o cosseno calculado em JS (`documents.ts:227-246`)
  por `ORDER BY embedding <=> query` no SQL.
- **Porquê ROI:** o RAG é a infra mais valiosa já construída e a que pior escala —
  hoje lê 500 chunks e ordena em processo. Em pgvector é uma query indexada. Melhora
  latência **e** desbloqueia Pattern Decimin e pesquisa transversal.
- **Esforço:** M · **Risco:** baixo (backfill já existe no worker; reusar).

### 2. Groq/DeepSeek no fallback do Council
- **O quê:** `FALLBACK_ORDER` é fixo `[claude, openai, perplexity]` (`runtime.ts:14`).
  Incluir Groq e DeepSeek e tornar configurável.
- **Porquê ROI:** já estão registados e a pagar mensalidade conceptual; hoje nunca
  são usados em fallback. Groq dá resiliência barata e rápida quando Claude/OpenAI
  falham ou estão lentos.
- **Esforço:** S · **Risco:** baixo.

### 3. Índices nas FKs
- **O quê:** índice em `workspace_id`/`project_id`/`agent_id` nas ~16 FKs sem
  cobertura (advisor de performance).
- **Porquê ROI:** barato agora, evita full scans quando os dados crescerem 100×.
- **Esforço:** S · **Risco:** muito baixo.

### 4. Cognitive Load no `/pending`
- **O quê:** painel "Conversas abertas · Compromissos pendentes · Decisões à espera
  · Carga actual" + recomendação, derivado de tabelas existentes.
- **Porquê ROI:** é um pilar da visão (Personal Decimin v2) hoje ausente, e
  reduz fricção diária real — diz à Inês onde focar sem ela ter de procurar.
- **Esforço:** M · **Risco:** baixo.

### 5. Confidence + razão visíveis na UI
- **O quê:** mostrar `confidence` e `confidence_reason` de `telegram_pending_items`
  em cada item do `/pending` (hoje só ordenam o briefing).
- **Porquê ROI:** dado já calculado e guardado, desperdiçado na UI; "porquê isto
  aparece" é exactamente o princípio de design.
- **Esforço:** S · **Risco:** muito baixo.

### 6. Cache GitHub/Netlify partilhada
- **O quê:** mover o cache por-instância (TTL 5 min, `github.ts:166`) para uma
  tabela/coluna ou KV, partilhado entre instâncias.
- **Porquê ROI:** em serverless (Netlify) cada cold start refaz chamadas à API do
  GitHub; partilhar reduz rate-limit e latência da timeline.
- **Esforço:** S · **Risco:** baixo.

### 7. Retry/backoff nas chamadas LLM e embeddings
- **O quê:** retry com backoff exponencial nas chamadas Anthropic/OpenAI no worker e
  no gateway (hoje uma falha = tick perdido, sem retry).
- **Porquê ROI:** elimina falhas silenciosas do agente de contexto, minions e
  backfill; pouco código.
- **Esforço:** S · **Risco:** baixo.

### 8. Chunking consciente de estrutura
- **O quê:** o chunking por parágrafo de 800 char (`documents.ts:108`) parte código,
  tabelas e listas. Respeitar fences de código, cabeçalhos e tabelas.
- **Porquê ROI:** melhora directamente a qualidade do RAG (chunks coerentes →
  respostas melhores) sem mudar a infra.
- **Esforço:** M · **Risco:** baixo.

### 9. RAG transversal opcional (cross-Space)
- **O quê:** permitir retrieval que cruza Spaces quando a pergunta o justifica
  (flag), em vez de estar sempre preso a um `workspace_id`.
- **Porquê ROI:** o conhecimento da Inês está espalhado; perguntas reais cruzam
  GAVINHO/DECIMA/PAPERS. Depende de pgvector (#1).
- **Esforço:** M · **Risco:** médio (ruído de contexto — mitigar com floor mais alto).

### 10. Pesquisa global (⌘K) sobre tudo
- **O quê:** um comando de pesquisa que cobre workspaces, decisões, documentos,
  leituras, timeline — já existe `WorkspaceSearchPill`, generalizar.
- **Porquê ROI:** reduz fricção de navegação diária; aproveita índices e embeddings
  já existentes.
- **Esforço:** M · **Risco:** baixo.

### 11. Shadow Mode em todos os minions
- **O quê:** os minions ainda não verificam `decimin_capabilities` (só o Telegram).
  Fazer todos respeitarem shadow/active/off.
- **Porquê ROI:** coerência da doutrina "trust is built, never assumed"; permite
  ligar capacidades novas sem risco.
- **Esforço:** M · **Risco:** baixo.

### 12. Suite de testes do laço central
- **O quê:** testes para gateway/routing, classificador, parsing de import,
  chunking e RAG. Hoje **0 testes**.
- **Porquê ROI:** o laço central é production-ready mas frágil a regressões; testes
  baratos nos pontos de maior churn.
- **Esforço:** M · **Risco:** baixo.

### 13. Custo/tokens por turno visível
- **O quê:** os metadados já guardam `tokens`/`model`; mostrar custo estimado por
  turno e agregado por workspace.
- **Porquê ROI:** controlo de custo de LLM com dado já existente; informa o routing.
- **Esforço:** S · **Risco:** muito baixo.

### 14. Dedupe/idempotência de import e timeline
- **O quê:** reforçar `external_id` em import e timeline para reimportações e
  re-syncs serem idempotentes (já há base; fechar lacunas).
- **Porquê ROI:** evita duplicados na timeline/leituras numa operação comum.
- **Esforço:** S · **Risco:** baixo.

### 15. Health do ecossistema na home
- **O quê:** um cartão na home com o estado dos conectores ligados (já há
  `getConnectorViews` e o badge MarkItDown).
- **Porquê ROI:** visibilidade operacional sem abrir `/ecosystem`; barato.
- **Esforço:** S · **Risco:** muito baixo.

---

## Quick wins desta semana (S, baixo risco)
#2 (fallback), #3 (índices), #5 (confidence UI), #7 (retry), #13 (custos),
#14 (idempotência), #15 (health). Sete melhorias S que, juntas, reduzem fricção,
custo e falhas silenciosas — sem tocar na arquitectura.
