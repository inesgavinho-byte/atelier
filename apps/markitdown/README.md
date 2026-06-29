# ATELIER — MarkItDown service

Converts binary documents (PDF, Word, Excel, PowerPoint, images with OCR, …)
into canonical **Markdown** for the workspace document pipeline (Bloco 5,
item 20). It's a thin HTTP wrapper around Microsoft's
[`markitdown`](https://github.com/microsoft/markitdown) library, which needs a
Python runtime that neither the Next.js web app (Netlify) nor the Node worker
(Railway) provides.

## Why a separate service

The web pipeline (`apps/web/src/lib/documents.ts`) handles text-like files
in-process. Binaries are sent here over HTTP. **It degrades gracefully:** if
`MARKITDOWN_URL` is unset in the web app, binaries stay queued as
`pending_conversion` exactly as before — nothing breaks without this service.

```
browser ──(base64)──▶ web server action ──(multipart)──▶ MarkItDown ──▶ Markdown
                              │                                            │
                              └────────── chunks + stores in Supabase ◀────┘
```

## Endpoints

| Method | Path       | Description                                            |
| ------ | ---------- | ------------------------------------------------------ |
| GET    | `/health`  | Liveness + whether `markitdown` imported.              |
| POST   | `/convert` | Multipart upload (field `file`) → `{ markdown, … }`.   |

`/convert` response:

```json
{ "markdown": "# Title\n\n…", "title": "…", "chars": 1234, "source_name": "x.pdf" }
```

## Configuration

See `.env.example`. All optional:

| Variable               | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `MARKITDOWN_TOKEN`     | If set, `/convert` requires `Authorization: Bearer <token>`.   |
| `MARKITDOWN_MAX_BYTES` | Upload backstop (default 25 MB).                               |
| `PORT`                 | Injected by Railway; default `8000` locally.                   |

## Run locally

```bash
cd apps/markitdown
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py            # → http://localhost:8000

# smoke test
curl -F file=@some.pdf http://localhost:8000/convert
```

## Deploy (Railway)

New service → repo → **Root Directory = `apps/markitdown`** (the Dockerfile and
`railway.json` are picked up automatically). Set `MARKITDOWN_TOKEN` if you want
auth. After deploy, copy the service URL into the **web app's** environment as
`MARKITDOWN_URL` (and the same `MARKITDOWN_TOKEN`). Health check: `/health`.
