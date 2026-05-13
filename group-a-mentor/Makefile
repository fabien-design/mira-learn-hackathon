# Group A — Mira Mentors : orchestration locale (Postgres + backend + frontend).
#
# Targets :
#   make install   — venv + pip deps + npm install
#   make up        — docker up + uvicorn + npm run dev (logs préfixés, Ctrl-C kill tout)
#   make down      — kill uvicorn/npm + docker compose down
#   make backend   — backend seul (foreground)
#   make web       — frontend seul (foreground)
#   make db        — Postgres seul (foreground watcher)
#   make migrate   — alembic upgrade head
#   make reset-db  — docker compose down -v && up + migrate

SHELL := /bin/bash
BACKEND_DIR := backend
WEB_DIR := web
VENV := $(BACKEND_DIR)/.venv
PIDS_DIR := .pids

.PHONY: help install up down backend web db migrate reset-db

help:
	@echo "Targets : install up down backend web db migrate reset-db"

install:
	@if [ ! -d "$(VENV)" ]; then python3 -m venv $(VENV); fi
	@. $(VENV)/bin/activate && pip install --quiet --upgrade pip && \
		pip install -r $(BACKEND_DIR)/requirements.txt -r $(BACKEND_DIR)/requirements-dev.txt
	@cd $(WEB_DIR) && npm install

up:
	@mkdir -p $(PIDS_DIR)
	@docker compose up -d
	@echo "[boot] postgres up — starting backend + frontend"
	@bash -c '\
		trap "echo; echo [stop] killing children; \
			if [ -f $(PIDS_DIR)/backend.pid ]; then kill $$(cat $(PIDS_DIR)/backend.pid) 2>/dev/null || true; fi; \
			if [ -f $(PIDS_DIR)/web.pid ]; then kill $$(cat $(PIDS_DIR)/web.pid) 2>/dev/null || true; fi; \
			rm -f $(PIDS_DIR)/*.pid; \
			docker compose stop; \
			exit 0" INT TERM EXIT; \
		( cd $(BACKEND_DIR) && . .venv/bin/activate && uvicorn main:app --reload --reload-include "*.py" --reload-exclude "uploads/*" --reload-exclude "*.pdf" --reload-exclude ".venv/*" --host 0.0.0.0 --port 8000 2>&1 | sed -u "s/^/[backend] /" ) & \
		echo $$! > $(PIDS_DIR)/backend.pid; \
		( cd $(WEB_DIR) && npm run dev 2>&1 | sed -u "s/^/[web]     /" ) & \
		echo $$! > $(PIDS_DIR)/web.pid; \
		wait; \
	'

down:
	-@if [ -f $(PIDS_DIR)/backend.pid ]; then kill $$(cat $(PIDS_DIR)/backend.pid) 2>/dev/null || true; fi
	-@if [ -f $(PIDS_DIR)/web.pid ]; then kill $$(cat $(PIDS_DIR)/web.pid) 2>/dev/null || true; fi
	-@rm -f $(PIDS_DIR)/*.pid
	docker compose down

backend:
	cd $(BACKEND_DIR) && . .venv/bin/activate && uvicorn main:app --reload --reload-include "*.py" --reload-exclude "uploads/*" --reload-exclude "*.pdf" --reload-exclude ".venv/*" --host 0.0.0.0 --port 8000

web:
	cd $(WEB_DIR) && npm run dev

db:
	docker compose up -d
	docker compose logs -f postgres

migrate:
	cd $(BACKEND_DIR) && . .venv/bin/activate && alembic upgrade head

reset-db:
	docker compose down -v
	docker compose up -d
	@echo "[reset] waiting for postgres to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		docker exec pg-hackathon-group-a pg_isready -U postgres -d postgres >/dev/null 2>&1 && break; \
		sleep 1; \
	done
	$(MAKE) migrate
