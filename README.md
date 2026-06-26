# ATELIER

**Where thought becomes work.**

ATELIER is the operating layer for Inês Gavinho's intellectual, editorial and
strategic projects. It is not a task manager, not a dashboard, not a CRM, not a
chat app — it is a digital workspace where ideas become work.

The principle is simple:

> Agents work. Inês judges. The interface surfaces only what requires
> attention, decision or direction.

PAPERS is the first pilot workspace; ATELIER itself is a general operating
layer designed to eventually orchestrate multiple projects (PAPERS, DECIMA,
GAVINHO, NUDO, Personal) and AI agents.

---

## Stack

- **Next.js 14** (App Router) · **React 18** · **TypeScript**
- **Tailwind CSS** with a GAVINHO-aligned editorial design system
- Structured, typed **mock data** (no LLM or database calls in Sprint 001)
- **Supabase-ready** architecture — a single data-access seam to swap later
- Deployable to **Vercel** or **Netlify** with zero configuration

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

## Routes

| Route                | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `/`                  | Home — *what requires Inês's judgement now*          |
| `/projects`          | All workspaces                                       |
| `/projects/[slug]`   | Project detail (PAPERS is the most developed)        |
| `/team`              | Agents — roles first, models second, autonomy ladder |
| `/memory`            | Structured knowledge base                            |
| `/approvals`         | Decisions requiring judgement                        |
| `/activity`          | Quiet chronological operational record               |

## Project structure

```
src/
├── app/                    # App Router routes
│   ├── layout.tsx          # Shell: sidebar (desktop) + top nav (mobile), fonts
│   ├── globals.css         # Editorial design system
│   ├── page.tsx            # Home
│   ├── projects/           # Projects list + [slug] detail
│   ├── team/ memory/ approvals/ activity/
│   └── not-found.tsx
├── components/             # Nav, ui primitives, ApprovalCard, PaperPipeline
├── data/
│   ├── types.ts            # Domain types (close to a future Supabase schema)
│   └── mock.ts             # Structured seed data
└── lib/
    ├── data.ts             # Data-access layer — THE Supabase swap point
    └── format.ts           # Label maps and formatters
```

## Design direction

Quiet, editorial, precise, high-trust, operational. Not SaaS-looking.

- Palette: Soft Cream `#F2F0E7`, Warm Beige `#ADAA96`, Olive Gray `#8B8670`,
  Charcoal `#1F1F1C`, Muted Gray `#6F6C60`
- Type: Cormorant Garamond (serif titles) · Quattrocento Sans (interface)
- Thin rules, generous whitespace, no loud buttons, no gradients, no shadows

Think: a private editorial control room. A studio operating table.

## Agent autonomy model

Every agent operates within an autonomy level. **All public-facing actions
require approval today.**

| Level | Meaning                       |
| ----- | ----------------------------- |
| 0     | Disabled                      |
| 1     | Draft only                    |
| 2     | Prepare & request approval    |
| 3     | Execute internal tasks        |
| 4     | Publish with approval         |
| 5     | Autonomous publishing         |

## Supabase readiness

The UI never touches mock data directly — it reads through `src/lib/data.ts`.
Each reader maps 1:1 to a future table:

```
projects · agents · workstreams · approvals · papers
ideas · principles · decisions · activity · (memory) entries
```

To migrate: create tables matching `src/data/types.ts`, then replace each
reader body in `src/lib/data.ts` with a Supabase query (and make them async).
No UI changes required.

## Sprint 002 (planned)

- Connect Supabase; persist approvals
- Authentication
- Editable project records
- Real PAPERS ingestion workflow
- GitHub integration
- OpenAI orchestration for the Editorial Director
- Publisher drafting workflow
- Analytics placeholders
