create-migrations:
	alembic revision --autogenerate

migrate:
	alembic upgrade head

undo-migrate:
	alembic downgrade -1

db:
	docker compose -f docker-compose.dev.yml up

db-down:
	docker compose -f docker-compose.dev.yml down

up:
	docker compose up --build

down:
	docker compose down

dev:
	.venv/bin/uvicorn app.main:app --reload --reload-dir app --timeout-graceful-shutdown 1 --log-level debug

cache:
	docker exec -it $SYSTEM_NAME-dev-cache bash

cache-clear:
	docker exec -it $SYSTEM_NAME-dev-cache redis-cli flushall

mail:
	python -m smtpd -c DebuggingServer -n localhost:1025

clear-port:
	@pids=$$(lsof -t -i:8000 2>/dev/null); \
	if [ -n "$$pids" ]; then kill -9 $$pids; echo "Killed: $$pids"; \
	else echo "Nothing listening on :8000"; fi

test:
	.venv/bin/python -m coverage run -m pytest

coverage-report:
	.venv/bin/python -m coverage html
