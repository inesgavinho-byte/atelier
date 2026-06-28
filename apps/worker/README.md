# @atelier/worker

Execution worker for the ATELIER runtime (ADR-0002), **POC**.

Polls the Supabase `jobs` queue and processes each queued job. Execution is
**simulated** for now (a delay + mock output); the real step will shell out to
the Claude Code CLI in an isolated workspace.

## Loops

Two loops run in parallel:

**Jobs (ADR-0002)** — every `WORKER_POLL_MS` (default 5s), select up to 5 jobs
with `status = 'queued'`, atomically claim each (`status → running`), simulate
work (`WORKER_SIMULATE_MS`, default 3s), then `status → done` with a mock
`output`. On failure: `status → error`.

**Context agent (ADR-0004)** — every `WORKER_CONTEXT_MS` (default hourly), for
each workspace with messages in the last `WORKER_CONTEXT_WINDOW_MS`, summarise
its canonical-chat conversation via Anthropic (Haiku) and upsert the result into
`workspace_context` (summary + decisions/artifacts/lessons), bumping `version`.
The chat then injects this compressed memory into its system prompt. Uses
`ANTHROPIC_API_KEY` **directly** (not the ATELIER gateway); without it the agent
logs and stays inactive.

## Rules

- Runs on **Railway**, never on Netlify.
- Uses `SUPABASE_SERVICE_ROLE_KEY` only — `jobs` and `workspace_context` are
  RLS-locked to the service role. The anon key is never used here.

## Local

```bash
cp .env.example .env   # fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run build && npm start
```

## Deploy (Railway)

- New service from this repo; set **Root Directory** to `apps/worker`.
- Builder: Dockerfile (see `railway.json`).
- Set env vars `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and (for the context
  agent) `ANTHROPIC_API_KEY`.

## Scripts

- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — compile to `dist/`
- `npm start` — run `dist/worker.js`
