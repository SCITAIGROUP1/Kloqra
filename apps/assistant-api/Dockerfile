# Monorepo build: Railway Root Directory stays / (repo root).
# Config file path: /apps/assistant-api/railway.toml
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    WEB_CONCURRENCY=2

COPY apps/assistant-api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/assistant-api/src ./src

EXPOSE 3003

CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-3003} --workers ${WEB_CONCURRENCY:-2}
