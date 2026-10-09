# Ticketing-System-

A scalable ticketing system designed to streamline issue reporting, ticket management, status tracking, and resolution. The system provides an organized workflow for users, team leads, and support administrators, improving transparency, efficiency, and overall service management.

---

## Architecture & Portals

- **Admin Portal** (`frontend/admin`): Full administrative oversight, employee and team lead user management, security settings, and analytics.
- **Team Lead Portal** (`frontend/teamlead`): Team ticket triaging, member assignments, escalation resolution, and ticket workflow controls.
- **Employee Portal** (`frontend/employee`): Self-service ticket creation, assignment tracking, status updates, and knowledge base access.
- **Backend Service** (`backend`): FastAPI asynchronous application with PostgreSQL / Supabase, Redis, and real-time support.

```
frontend/admin/       React + Vite · TypeScript · Tailwind CSS
frontend/teamlead/    React + Vite · TypeScript · Tailwind CSS
frontend/employee/    React + Vite · TypeScript · Tailwind CSS
backend/              FastAPI · Pydantic v2 · SQLAlchemy 2 · Supabase
e2e-tests/            Playwright E2E & API test suites
```

---

## Quick Start

### 1. Configure Environment
Copy `.env.example` to `.env` in respective modules and configure database or authentication parameters.

### 2. Start Services

**Backend:**
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Admin Portal:**
```bash
cd frontend/admin
npm run dev
# Running on http://localhost:3000
```

**Team Lead Portal:**
```bash
cd frontend/teamlead
npm run dev
# Running on http://localhost:4174
```

**Employee Portal:**
```bash
cd frontend/employee
npm run dev
# Running on http://localhost:4173
```

---

## Service URLs

| Portal / Service | Port / URL | Description |
|---|---|---|
| Admin Portal | http://localhost:3000 | Administrative dashboard & user management |
| Employee Portal | http://localhost:4173 | Employee self-service & ticket submission |
| Team Lead Portal | http://localhost:4174 | Team management & ticket assignment |
| Backend API | http://localhost:8000 | FastAPI REST API |
| Swagger Docs | http://localhost:8000/docs | Interactive API documentation |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontends | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | FastAPI + Python 3.11+ |
| Database | PostgreSQL / Supabase Cloud Database |
| Realtime & Auth | Supabase Client / Custom JWT |
| Testing | Playwright TypeScript E2E & API Tests |
| Background / Cache | Redis & Celery support |
