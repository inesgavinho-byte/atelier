"""ATELIER — MarkItDown conversion service (Bloco 5, item 20).

A small FastAPI service that turns binary documents (PDF, Word, Excel,
PowerPoint, images with OCR, …) into canonical Markdown, using Microsoft's
`markitdown` library. It exists because that conversion needs a Python runtime
that the Next.js web app and the Node worker don't have; the web app's document
pipeline calls this over HTTP when MARKITDOWN_URL is set, and otherwise keeps
queuing binaries as `pending_conversion` (graceful degrade).

Endpoints
---------
GET  /health   → liveness + whether markitdown imported.
POST /convert  → multipart upload (field `file`) → {"markdown": "...", ...}.

Auth
----
Optional. When MARKITDOWN_TOKEN is set, /convert requires
`Authorization: Bearer <token>`. When unset the endpoint is open (fine for a
private Railway service on an internal URL).
"""

from __future__ import annotations

import os
import tempfile

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

# markitdown is imported lazily-tolerantly so /health still answers if the
# dependency failed to install — the error surfaces clearly on /convert.
try:
    from markitdown import MarkItDown

    _MD_IMPORT_ERROR: str | None = None
except Exception as exc:  # pragma: no cover - import-time guard
    MarkItDown = None  # type: ignore[assignment]
    _MD_IMPORT_ERROR = str(exc)

# A generous cap so a runaway upload can't exhaust memory. The web app caps far
# lower (Netlify payload limits); this is the backstop for direct callers.
MAX_BYTES = int(os.environ.get("MARKITDOWN_MAX_BYTES", str(25 * 1024 * 1024)))
TOKEN = os.environ.get("MARKITDOWN_TOKEN")

app = FastAPI(title="ATELIER MarkItDown", version="1.0.0")

# A single converter instance is reused across requests. Plugins are disabled
# for predictable, sandboxed behaviour.
_converter = MarkItDown(enable_plugins=False) if MarkItDown else None


def _check_auth(authorization: str | None) -> None:
    """Enforce the bearer token when one is configured."""
    if not TOKEN:
        return
    expected = f"Bearer {TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Token inválido ou em falta.")


@app.get("/health")
def health() -> dict:
    return {
        "ok": _converter is not None,
        "markitdown": _converter is not None,
        "error": _MD_IMPORT_ERROR,
        "max_bytes": MAX_BYTES,
        "auth": bool(TOKEN),
    }


@app.post("/convert")
async def convert(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
) -> JSONResponse:
    _check_auth(authorization)

    if _converter is None:
        raise HTTPException(
            status_code=503,
            detail=f"markitdown indisponível: {_MD_IMPORT_ERROR}",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Ficheiro vazio.")
    if len(data) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Ficheiro demasiado grande (>{MAX_BYTES} bytes).",
        )

    # markitdown dispatches on the file extension, so preserve it on the temp
    # file. Without a usable extension it falls back to plain-text handling.
    name = file.filename or "documento"
    suffix = os.path.splitext(name)[1] or ""
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        result = _converter.convert(tmp_path)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Conversão falhou: {exc}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    markdown = (result.text_content or "").strip()
    return JSONResponse(
        {
            "markdown": markdown,
            "title": (result.title or name) if hasattr(result, "title") else name,
            "chars": len(markdown),
            "source_name": name,
        }
    )


if __name__ == "__main__":  # pragma: no cover - local dev entrypoint
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port)
