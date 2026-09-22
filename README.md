# Platform

A production-ready Phase 1 monorepo — **Next.js + FastAPI + PostgreSQL + Redis + Keycloak + MinIO + Celery**.

---

## Architecture

```
frontend/     Next.js 14 · App Router · MUI · TanStack Query · Keycloak JS
backend/      FastAPI · Pydantic v2 · SQLAlchemy 2 · Alembic · Celery
infra/        Keycloak realm config · MinIO init
.github/      Backend CI · Frontend CI · Docker build
```

## Quick Start

### Prerequisites
- Docker Desktop 4.x+
- Make (optional but recommended)

### 1. Clone and configure
```bash
git clone <your-repo>
cd platform
cp .env.example .env   # edit secrets as needed
```

### 2. Start everything
```bash
make dev
# or: docker compose up -d --build
```

### 3. Apply database migrations
```bash
make migrate
# or: docker compose exec backend alembic upgrade head
```

### Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (dev) | http://localhost:8000/docs |
| Keycloak Admin | http://localhost:8080 (admin / admin) |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |

### Seed Credentials (Keycloak)

| User | Password | Roles |
|---|---|---|
| admin@platform.dev | admin123 | admin, user |
| user@platform.dev | user123 | user |

---

## Development Workflow

```bash
make logs               # tail all service logs
make logs-backend       # backend only
make lint               # lint backend + frontend
make test               # run all tests
make makemigrations MSG="add projects table"   # generate migration
make migrate            # apply migrations
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + React 18 + TypeScript |
| UI | Material UI 5 |
| Data fetching | TanStack Query v5 |
| Backend | FastAPI + Pydantic v2 |
| ORM | SQLAlchemy 2.x (async) |
| Migrations | Alembic |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| File storage | MinIO (S3-compatible) |
| Background jobs | Celery + Redis |
| Auth | Keycloak 24 (OAuth2 + OIDC + PKCE) |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Observability | OpenTelemetry + Sentry + structlog |
