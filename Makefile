# ============================================================================
#  Dataset Manager Pro — Makefile
#  Run both backend (FastAPI) and frontend (Vite/React) with a single command.
# ============================================================================

# Paths
ROOT_DIR     := $(shell pwd)
BACKEND_DIR  := $(ROOT_DIR)/backend
FRONTEND_DIR := $(ROOT_DIR)/ui
VENV_DIR     := $(ROOT_DIR)/.venv
VENV_PYTHON  := $(VENV_DIR)/bin/python
LOG_DIR      := $(ROOT_DIR)/logs

# Backend settings
BACKEND_HOST := 0.0.0.0
BACKEND_PORT := 8000
BACKEND_WORKERS := 1
UVICORN_OPTS := --host $(BACKEND_HOST) --port $(BACKEND_PORT) --reload

# Frontend settings
FRONTEND_PORT := 5173

# PID files (to track background processes)
BACKEND_PID  := $(LOG_DIR)/backend.pid
FRONTEND_PID := $(LOG_DIR)/frontend.pid

# Colors
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RED    := \033[0;31m
NC     := \033[0m

# ============================================================================
#  Main targets
# ============================================================================

.PHONY: run stop restart status logs install clean help \
        backend frontend backend-stop frontend-stop \
        backend-log frontend-log

## run            : Start both backend and frontend in the background
run: _ensure-logs
	@echo "$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(CYAN)  Dataset Manager Pro$(NC)"
	@echo "$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@$(MAKE) --no-print-directory backend
	@sleep 1
	@$(MAKE) --no-print-directory frontend
	@sleep 1
	@echo ""
	@echo "$(GREEN)  Both services are running:$(NC)"
	@echo "    Backend  → $(YELLOW)http://localhost:$(BACKEND_PORT)$(NC)  (API docs: http://localhost:$(BACKEND_PORT)/api/docs)"
	@echo "    Frontend → $(YELLOW)http://localhost:$(FRONTEND_PORT)$(NC)"
	@echo ""
	@echo "  Logs:  $(CYAN)make logs$(NC)  |  $(CYAN)make backend-log$(NC)  |  $(CYAN)make frontend-log$(NC)"
	@echo "  Stop:  $(CYAN)make stop$(NC)"
	@echo "$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"

## backend        : Start the FastAPI backend (background)
backend: _ensure-logs
	@if [ -f $(BACKEND_PID) ] && kill -0 $$(cat $(BACKEND_PID)) 2>/dev/null; then \
		echo "$(YELLOW)⚠ Backend already running (PID $$(cat $(BACKEND_PID)))$(NC)"; \
	else \
		echo "$(GREEN)▶ Starting backend on :$(BACKEND_PORT)...$(NC)"; \
		cd $(BACKEND_DIR) && \
		$(VENV_PYTHON) -m uvicorn main:app $(UVICORN_OPTS) \
			> $(LOG_DIR)/backend.log 2>&1 & \
		echo $$! > $(BACKEND_PID); \
		echo "  PID: $$(cat $(BACKEND_PID))  →  log: $(LOG_DIR)/backend.log"; \
	fi

## frontend       : Start the Vite dev server (background)
frontend: _ensure-logs
	@if [ -f $(FRONTEND_PID) ] && kill -0 $$(cat $(FRONTEND_PID)) 2>/dev/null; then \
		echo "$(YELLOW)⚠ Frontend already running (PID $$(cat $(FRONTEND_PID)))$(NC)"; \
	else \
		echo "$(GREEN)▶ Starting frontend on :$(FRONTEND_PORT)...$(NC)"; \
		cd $(FRONTEND_DIR) && \
		npx vite --port $(FRONTEND_PORT) \
			> $(LOG_DIR)/frontend.log 2>&1 & \
		echo $$! > $(FRONTEND_PID); \
		echo "  PID: $$(cat $(FRONTEND_PID))  →  log: $(LOG_DIR)/frontend.log"; \
	fi

# ============================================================================
#  Stop targets
# ============================================================================

## stop           : Stop both backend and frontend
stop:
	@$(MAKE) --no-print-directory backend-stop
	@$(MAKE) --no-print-directory frontend-stop
	@echo "$(GREEN)✓ All services stopped.$(NC)"

## backend-stop   : Stop the backend
backend-stop:
	@if [ -f $(BACKEND_PID) ]; then \
		PID=$$(cat $(BACKEND_PID)); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "$(RED)■ Stopping backend (PID $$PID)...$(NC)"; \
			kill $$PID 2>/dev/null; \
			sleep 1; \
			kill -9 $$PID 2>/dev/null || true; \
		fi; \
		rm -f $(BACKEND_PID); \
	else \
		echo "  Backend not running."; \
	fi

## frontend-stop  : Stop the frontend
frontend-stop:
	@if [ -f $(FRONTEND_PID) ]; then \
		PID=$$(cat $(FRONTEND_PID)); \
		if kill -0 $$PID 2>/dev/null; then \
			echo "$(RED)■ Stopping frontend (PID $$PID)...$(NC)"; \
			kill $$PID 2>/dev/null; \
			sleep 1; \
			kill -9 $$PID 2>/dev/null || true; \
		fi; \
		rm -f $(FRONTEND_PID); \
	else \
		echo "  Frontend not running."; \
	fi

## restart        : Stop then start both services
restart: stop run

# ============================================================================
#  Status & logs
# ============================================================================

## status         : Show running status of both services
status:
	@echo "$(CYAN)━━━ Service Status ━━━$(NC)"
	@if [ -f $(BACKEND_PID) ] && kill -0 $$(cat $(BACKEND_PID)) 2>/dev/null; then \
		echo "  Backend:  $(GREEN)RUNNING$(NC)  (PID $$(cat $(BACKEND_PID)))  http://localhost:$(BACKEND_PORT)"; \
	else \
		echo "  Backend:  $(RED)STOPPED$(NC)"; \
	fi
	@if [ -f $(FRONTEND_PID) ] && kill -0 $$(cat $(FRONTEND_PID)) 2>/dev/null; then \
		echo "  Frontend: $(GREEN)RUNNING$(NC)  (PID $$(cat $(FRONTEND_PID)))  http://localhost:$(FRONTEND_PORT)"; \
	else \
		echo "  Frontend: $(RED)STOPPED$(NC)"; \
	fi

## logs           : Tail both logs side by side
logs:
	@echo "$(CYAN)━━━ Backend log (last 20 lines) ━━━$(NC)"
	@tail -20 $(LOG_DIR)/backend.log 2>/dev/null || echo "  No backend log."
	@echo ""
	@echo "$(CYAN)━━━ Frontend log (last 20 lines) ━━━$(NC)"
	@tail -20 $(LOG_DIR)/frontend.log 2>/dev/null || echo "  No frontend log."

## backend-log    : Follow the backend log
backend-log:
	@tail -f $(LOG_DIR)/backend.log

## frontend-log   : Follow the frontend log
frontend-log:
	@tail -f $(LOG_DIR)/frontend.log

# ============================================================================
#  Setup & maintenance
# ============================================================================

## install        : Install dependencies for both backend and frontend
install:
	@echo "$(CYAN)▶ Installing backend dependencies...$(NC)"
	cd $(BACKEND_DIR) && $(VENV_PYTHON) -m pip install -r requirements.txt
	@echo ""
	@echo "$(CYAN)▶ Installing frontend dependencies...$(NC)"
	cd $(FRONTEND_DIR) && npm install
	@echo ""
	@echo "$(GREEN)✓ All dependencies installed.$(NC)"

## clean          : Remove logs and PID files
clean: stop
	@rm -rf $(LOG_DIR)
	@echo "$(GREEN)✓ Cleaned logs and PID files.$(NC)"

# ============================================================================
#  Internal
# ============================================================================

_ensure-logs:
	@mkdir -p $(LOG_DIR)

## help           : Show this help
help:
	@echo "$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(CYAN)  Dataset Manager Pro — Makefile$(NC)"
	@echo "$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo ""
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## /  /'
	@echo ""
	@echo "  $(YELLOW)Examples:$(NC)"
	@echo "    make run          # Start everything"
	@echo "    make stop         # Stop everything"
	@echo "    make restart      # Restart both services"
	@echo "    make status       # Check what's running"
	@echo "    make logs         # View recent logs"
	@echo "    make backend-log  # Follow backend log in real time"
	@echo ""
