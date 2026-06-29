# ATELIER — Plataforma Cognitiva de Trabalho

**Onde o pensamento se torna trabalho.**

O ATELIER não é um chat. Não é um *dashboard*. É um **sistema operativo
cognitivo** para trabalho intelectual: o lugar onde observação, investigação,
decisão e execução vivem como partes do mesmo processo — e onde nada do que se
aprende se perde.

Este repositório é o **Repositório Fundacional do ATELIER**: a fonte de verdade
tanto para o **código do produto** (`apps/`) como para a **filosofia do
produto** (`atelier/`).

---

## Princípio central

> **O contexto pertence ao ATELIER, não às ferramentas.**

As LLMs (Claude, OpenAI, Perplexity, Groq, DeepSeek) são motores de execução
substituíveis. A conversa, a memória, as decisões e o conhecimento pertencem à
plataforma — não ao fornecedor que, num dado momento, executa um pedido. Trocar
de modelo nunca apaga o trabalho.

A visão completa está em [`atelier/VISION.md`](atelier/VISION.md); os princípios
fundamentais em [`atelier/PRINCIPLES.md`](atelier/PRINCIPLES.md); o manifesto
fundador (aprovado) em
[`atelier/010-philosophy/AT-0001-manifesto.md`](atelier/010-philosophy/AT-0001-manifesto.md).

---

## Arquitectura, em uma linha

```
Humano
  │
  ▼
DECIMA Workspace ── a plataforma cognitiva (o ambiente de trabalho)
  │
  ├─ Spaces ───────── domínios de trabalho (PAPERS, GAVINHO, NUDO, Pessoal…)
  │    │
  │    ├─ Projects ── unidades de trabalho dentro de um Space
  │    │    │
  │    │    └─ Sessions ── conversas com intenção (chat contínuo do Council)
  │    │
  │    └─ Documents · Readings · Captures ── matéria-prima
  │
  ▼
Processing Pipeline ── OCR → MarkItDown → chunks → Knowledge  (planeado)
  │
  ▼
DECIMA ──────────── memória e conhecimento preservados
  │
  ▼
DECIM001 ────────── Cognitive Engine permanente (visão futura)
```

> Nota honesta: "Spaces", o "Processing Pipeline" e o "DECIM001" são a **visão**.
> O que está **implementado hoje** são Workspaces, Projectos, o chat contínuo do
> Council, Minions, importação de contexto e a memória comprimida por workspace.
> Ver [`atelier/ARCHITECTURE.md`](atelier/ARCHITECTURE.md) (real vs planeado) e
> [`atelier/ROADMAP.md`](atelier/ROADMAP.md).

---

## Stack técnica

- **Monorepo** npm workspaces.
  - `apps/web` (`@atelier/web`) — Next.js 14 (App Router), React 18, TypeScript,
    Tailwind. Deploy no **Netlify**.
  - `apps/worker` (`@atelier/worker`) — worker Node em *polling*. Deploy no
    **Railway**. Corre os *jobs*, o agente de contexto e os Minions.
- **Supabase** (Postgres + RLS) — dados, credenciais de conectores (RLS-locked
  ao service role), memória de workspace.
- **AI Gateway** — abstracção sobre os fornecedores; o Council faz *routing* por
  tipo de tarefa. Streaming de respostas via SSE.

---

## Como correr localmente

Monorepo com *workspaces* npm — os comandos da raiz delegam em `@atelier/web`:

```bash
npm install      # instala dependências de todos os workspaces
npm run dev      # servidor de desenvolvimento (http://localhost:3000)
npm run build    # build de produção
npm run start    # serve o build
npm run typecheck
npm run lint
```

O worker corre à parte:

```bash
npm run --workspace @atelier/worker dev    # (ou build/start)
```

---

## Variáveis de ambiente

Nada é obrigatório para fazer *build* — valores em falta degradam de forma
graciosa. A referência completa, comentada, está em
[`apps/web/.env.example`](apps/web/.env.example). As principais:

| Variável | Para quê |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dados reais |
| `SUPABASE_SERVICE_ROLE_KEY` | Credenciais de conectores, jobs, Minions, contexto (tabelas RLS-locked) |
| `SUPABASE_ACCESS_TOKEN` | Info por workspace (tabelas, contagens) + SQL read-only do Council |
| `ANTHROPIC_API_KEY` · `OPENAI_API_KEY` · `PERPLEXITY_API_KEY` · `GROQ_API_KEY` · `DEEPSEEK_API_KEY` | Fornecedores de IA (chat, importação, Minions) |
| `ATELIER_ACCESS_PASSWORD` | Porta de acesso opcional (um `/login` partilhado) |
| `ATELIER_CRED_KEY` | Encripta credenciais de conectores em repouso (AES-256-GCM) |
| `ICS_CALENDAR_URL` · `ATELIER_TIMEZONE` | Agenda de hoje (feed ICS) |
| `GITHUB_TOKEN` · `NETLIFY_*` | Conectores de *developer* / *deploy* |

> O worker (Railway) precisa de `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` e,
> para o agente de contexto / Minions, de `ANTHROPIC_API_KEY`.

---

## Decisões arquitecturais (ADR)

Em [`atelier/060-decisions/`](atelier/060-decisions/):

- **ADR-0002** — Runtime de execução: Council + Claude Code CLI
- **ADR-0003** — Interface Telegram (ATELIER Mobile)
- **ADR-0004** — Chat contínuo por workspace com agente de contexto
- **ADR-0005** — Sessões, Timeline e Chat como Interface

---

## Roadmap, em alto nível

1. **Consolidação** (em curso) — chat contínuo, Council com *routing* + streaming,
   GitHub por workspace, importação de contexto, Minions, projectos.
2. **Pipeline de conhecimento** — documentos (OCR → MarkItDown → chunks → índice),
   biblioteca por Space, extracção automática.
3. **Timeline** — ADR-0005 Fatia 2: sessões com intenção + todos os eventos
   agregados cronologicamente.
4. **DECIM001** — Cognitive Engine permanente, *knowledge graph*, memória
   partilhada entre Spaces.

Detalhe (com o que fica **fora** de âmbito) em
[`atelier/ROADMAP.md`](atelier/ROADMAP.md).

---

## Como navegar a documentação

- [`atelier/`](atelier/) — fundação intelectual (manifesto, ontologia, decisões,
  conhecimento). Ver [`atelier/README.md`](atelier/README.md) para o índice.
- Documentos consolidados na raiz de `atelier/`: **VISION**, **ARCHITECTURE**,
  **ROADMAP**, **PRINCIPLES**.

## Língua

Toda a documentação está em **Português Europeu** — a língua da utilizadora e do
projecto.
