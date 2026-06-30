---
title: Conexões a apps e ferramentas de terceiros — ATELIER / DECIMA
date: 2026-06-30
status: plano
---

# Plano de conexões a terceiros

> Estado do Ecossistema e plano para os próximos conectores. Prioriza por impacto
> no trabalho real (GAVINHO, DECIMA, PAPERS), não por número de integrações.
> Ver registo em `apps/web/src/lib/connectors.ts`.

## 1. Estado actual do Ecossistema

O registo tem **21 conectores** (a referência informal a "18" está desatualizada).
Por modelo de autenticação:

**Ligados / testáveis ao vivo (chave/URL) — 9:**
`OpenAI`, `Claude`, `Perplexity`, `Groq`, `DeepSeek` (IA) · `ICS Calendar` ·
`GitHub` · `Netlify` · `Supabase`. Estes têm teste de ligação server-side e estão
em uso real (LLMs no Council, GitHub/Netlify na Timeline, Supabase como BD).

**Stubs OAuth (sem implementação) — 10:**
`Gmail`, `Outlook Email`, `Teams`, `Google Calendar`, `Outlook Calendar`,
`Google Drive`, `SharePoint`, `OneDrive`, `LinkedIn`, `Instagram`. Aparecem como
"Requer OAuth"; **não há fluxo OAuth nem código de integração**.

**Outros — 2:**
`Importação de Chats` (✅ funcional, via `/import`) · `Manus` (declarado, não
testável).

**Conclusão honesta:** a camada de IA e dev-ops (GitHub/Netlify/Supabase) está
viva; **toda a produtividade (email, calendário, documentos, social) é stub**. O
maior buraco da visão — **Living Artifacts depende de Google Workspace, que não
existe**.

---

## 2. Prioridade por impacto no trabalho real

Ordenado pelo que destrava trabalho da Inês em GAVINHO/DECIMA/PAPERS, não por
facilidade:

| Prioridade | Conector | Porquê | Desbloqueia |
|---|---|---|---|
| **P0** | **Google Drive + Google Docs** | Onde vivem os documentos reais; é a dependência do Living Artifacts | Living Artifacts, ingestão automática de documentos, knowledge base real |
| **P0** | **Gmail / Google Calendar** | Pending Intelligence e Cognitive Load só ficam reais com email+agenda; hoje só Telegram | Personal Decimin v2 fora do Telegram |
| **P1** | **Microsoft 365** (Outlook/Teams/SharePoint/OneDrive) | Alternativa/realidade corporativa de muitos clientes | Mesmo valor, ecossistema Microsoft |
| **P2** | **LinkedIn** | Fase 5 (Publicação) — distribuição do output PAPERS/DECIMA | Cadeia editorial automática |
| **P3** | **Instagram** | Publicação visual; menos crítico para o trabalho intelectual | — |

Nota: Google primeiro porque cobre os três pilares (Drive=documentos,
Gmail=comunicação, Calendar=agenda) com **um** provider OAuth, e porque destrava a
peça mais valiosa da visão (Living Artifacts).

---

## 3. OAuth genérico (padrão reutilizável)

Hoje cada conector OAuth é uma entrada declarativa sem implementação. Em vez de
construir 10 integrações uma a uma, construir **um** padrão OAuth2 reutilizável:

- **Tabela `oauth_connections`** (por utilizador/Space): `provider`, `scopes`,
  `access_token`/`refresh_token` (cifrados — já há `lib/crypto.ts` +
  `connector_credentials`), `expires_at`.
- **Rotas genéricas** `/api/oauth/[provider]/start` e `/callback`, parametrizadas
  por uma config por provider (authorize URL, token URL, scopes). Google e Microsoft
  partilham 90% do fluxo (OAuth2 + refresh).
- **Refresh automático** centralizado; um cliente por provider que pega no token
  válido.
- **Camada de capacidades** fina por provider (listFiles, readDoc, listEvents,
  searchEmail) por cima do token — é aqui que diverge, não no auth.

Assim, adicionar SharePoint depois do Google Drive é escrever as capacidades, não
o auth. Estimativa: **L** para o padrão + primeiro provider (Google); **M** por
provider seguinte.

---

## 4. MCP vs integrações directas

**Recomendação: híbrido, com MCP como default para *leitura/contexto* e directo
para *acções críticas*.**

- **MCP (Model Context Protocol)** — vale a pena para **dar contexto ao Council**:
  ler ficheiros, pesquisar email/drive, listar eventos. Ganha-se um protocolo
  uniforme e o ecossistema crescente de servidores MCP (Google, Microsoft, etc.),
  evitando manter N clientes à mão. Encaixa na doutrina "o contexto pertence ao
  ATELIER" — o MCP traz contexto, a memória fica no ATELIER.
- **Integrações directas** — necessárias para **acções de escrita com garantias**:
  editar um Google Doc como Living Artifact, publicar no LinkedIn, criar evento.
  Aqui quer-se controlo fino de scopes, idempotência e tratamento de erros que um
  servidor MCP genérico não dá.
- **Risco do MCP:** servidores autenticados interactivamente podem não estar
  disponíveis em execução headless (worker/cron) — exactamente os contextos onde o
  Personal Decimin corre. Para o worker, preferir integração directa com tokens
  guardados.

Conclusão: **MCP para enriquecer o contexto do chat/Council; OAuth directo (com o
padrão do §3) para as acções de escrita e para tudo o que o worker faz sem humano.**

---

## 5. Living Artifacts depende disto

É a integração mais crítica da visão e **ainda não existe**. `DECIMA-LIVING-ARTIFACTS`
diz: "DECIMA never generates disposable files… maintains Living Artifacts" editando
diretamente Google Docs/Sheets/Slides, com Markdown canónico como representação de
referência. Hoje: `artifacts` tem 7 rows, `artifact_revisions` tem **0** e não há
Google.

Caminho mínimo para tornar real:
1. OAuth Google (Drive + Docs) via o padrão do §3 — **P0**.
2. Ligar um `artifact` a um `file_id` Google; editar o Doc a partir do ATELIER cria
   uma `artifact_revision` (snapshot + diff). Identidade persiste (`id`,
   `owner_space`, `revision`).
3. Pipeline canónico: Doc/ficheiro → MarkItDown → Markdown canónico → chunks →
   embeddings (pgvector) → biblioteca pesquisável. As peças existem; falta o fio.

---

## 6. Sequência recomendada

1. **Padrão OAuth2 genérico + Google (Drive/Gmail/Calendar)** — um provider, três
   capacidades de alto valor; destrava Living Artifacts e Personal Decimin real.
2. **Living Artifacts sobre Google Docs** — revisões reais + edição directa.
3. **MCP para leitura/contexto** no chat (Drive/Gmail como contexto do Council).
4. **Microsoft 365** pelo mesmo padrão (corporativo).
5. **LinkedIn** (Publicação, Fase 5) quando a cadeia editorial for o foco.
6. **Instagram** por último.

**Pré-requisitos transversais:** `lib/crypto.ts` + `connector_credentials` já dão a
base de guardar tokens cifrados; falta refresh automático e as rotas OAuth
genéricas. pgvector (ver `ROI-IMPROVEMENTS.md` #1) é pré-requisito de a ingestão de
documentos do Drive ser útil a escala.
