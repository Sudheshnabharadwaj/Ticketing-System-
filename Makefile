.PHONY: help dev down logs migrate makemigrations lint format test build

# ── Colours ─────────────────────────────────────────────────────────────────
CYAN  := \033[0;36m
RESET := \033[0m

help: ## Show this help message
	@echo ""
	@echo "  $(CYAN)Platform — Makefile targets$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ── Docker ───────────────────────────────────────────────────────────────────
dev: ## Start all services in dev mode (detached)
	cp -n .env.example .env 2>/dev/null || true
	docker compose up -d --build

down: ## Stop and remove all containers
	docker compose down

down-volumes: ## Stop containers AND remove volumes (⚠ destroys data)
	docker compose down -v

logs: ## Tail logs for all services
	docker compose logs -f

logs-backend: ## Tail backend logs only
	docker compose logs -f backend

logs-worker: ## Tail celery worker logs only
	docker compose logs -f celery-worker

logs-frontend: ## Tail frontend logs only
	docker compose logs -f frontend

ps: ## Show running containers
	docker compose ps

# ── Database ─────────────────────────────────────────────────────────────────
migrate: ## Apply all pending Alembic migrations
	docker compose exec backend alembic upgrade head

makemigrations: ## Generate a new Alembic migration (MSG="description")
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

downgrade: ## Roll back last Alembic migration
	docker compose exec backend alembic downgrade -1

db-shell: ## Open a psql shell
	docker compose exec postgres psql -U platform platform_db

# ── Backend ───────────────────────────────────────────────────────────────────
lint-backend: ## Lint backend with ruff
	docker compose exec backend ruff check app tests

format-backend: ## Format backend with ruff
	docker compose exec backend ruff format app tests

typecheck-backend: ## Type-check backend with mypy
	docker compose exec backend mypy app

test-backend: ## Run backend tests with pytest
	docker compose exec backend pytest tests -v

# ── Frontend ──────────────────────────────────────────────────────────────────
lint-frontend: ## Lint frontend with ESLint
	docker compose exec frontend npm run lint

typecheck-frontend: ## Type-check frontend with tsc
	docker compose exec frontend npm run typecheck

# ── Combined ──────────────────────────────────────────────────────────────────
lint: lint-backend lint-frontend ## Lint everything
test: test-backend ## Run all tests
