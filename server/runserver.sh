docker compose up -d &
uvicorn app.main:app --reload --log-level debug