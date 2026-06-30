# Kloqra Assistant API

Internal FastAPI service for the member help assistant. Not exposed publicly in production.

## Run locally

```bash
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
uvicorn src.main:app --reload --port 3003
```

## Test

```bash
pytest
```

## Endpoints

- `GET /health` — health check
- `POST /internal/chat` — requires `X-Assistant-Secret` header

See [docs/specs/assistant.md](../../docs/specs/assistant.md).
