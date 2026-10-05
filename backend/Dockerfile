# ── Stage: base ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ── Stage: deps ─────────────────────────────────────────────────────────────
FROM base AS deps

COPY pyproject.toml ./
RUN pip install --no-cache-dir -e ".[dev]"

# ── Stage: dev (used by docker compose) ─────────────────────────────────────
FROM deps AS dev
# Source is mounted as a volume — no COPY needed
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── Stage: prod ─────────────────────────────────────────────────────────────
FROM deps AS prod
COPY . .
RUN useradd --create-home --shell /bin/bash appuser && chown -R appuser /app
USER appuser
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
