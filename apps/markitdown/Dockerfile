# ATELIER MarkItDown service — Railway image (Bloco 5).
# Build context is apps/markitdown (set Railway's Root Directory to
# apps/markitdown), so it installs standalone. Railway injects $PORT.

FROM python:3.12-slim

# Some markitdown extractors shell out to system tools (e.g. ffmpeg for audio).
# Keep the image small but functional for the common document formats.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./

# Railway sets $PORT; default to 8000 for local runs.
ENV PORT=8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
