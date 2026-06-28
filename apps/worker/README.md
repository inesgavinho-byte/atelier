# @atelier/worker

Execution worker for the ATELIER runtime (ADR-0002), **POC**.

Polls the Supabase `jobs` queue and processes each queued job. Execution is
**simulated** for now (a delay + mock output); the real step will shell out to
the Claude Code CLI in an isolated workspace.

## Loop

1. Every `WORKER_POLL_MS` (default 5s), select up to 5 jobs with `status = 'queued'`.
2. For each: atomically claim it (`status → running`), simulate work
   (`WORKER_SIMULATE_MS`, default 3s), then set `status → done` with a mock
   `output`. On failure: `status → error` with the message.

## Rules

- Runs on **Railway**, never on Netlify.
- Uses `SUPABASE_SERVICE_ROLE_KEY` only — the `jobs` table is RLS-locked to the
  service role. The anon key is never used here.

## Local

```bash
cp .env.example .env   # fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run build && npm start
```

## Deploy (Railway)

- New service from this repo; set **Root Directory** to `apps/worker`.
- Builder: Dockerfile (see `railway.json`).
- Set env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Scripts

- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — compile to `dist/`
- `npm start` — run `dist/worker.js`
