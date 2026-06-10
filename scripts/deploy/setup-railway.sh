#!/usr/bin/env bash
# Bootstrap a Railway staging or production project for the Kloqra API.
#
# Prerequisites:
#   - Railway CLI: https://docs.railway.com/guides/cli
#   - Logged in: railway login
#
# Usage:
#   bash scripts/deploy/setup-railway.sh staging
#   bash scripts/deploy/setup-railway.sh production
set -euo pipefail

ENV_NAME="${1:-}"
if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ]]; then
  echo "usage: bash scripts/deploy/setup-railway.sh <staging|production>" >&2
  exit 1
fi

PROJECT_NAME="kloqra-${ENV_NAME}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if ! command -v railway >/dev/null 2>&1; then
  if [[ -f "$ROOT/node_modules/.bin/railway" ]]; then
    railway() { "$ROOT/node_modules/.bin/railway" "$@"; }
  else
    echo "error: railway CLI not found. Run: pnpm install (includes @railway/cli)" >&2
    exit 1
  fi
fi

cd "$ROOT"

echo "=== Kloqra Railway setup: ${PROJECT_NAME} ==="
echo ""
echo "This script guides CLI setup. You can also use the Railway dashboard:"
echo "  https://railway.app → New Project → Deploy from GitHub"
echo ""

read -r -p "Create/link Railway project '${PROJECT_NAME}'? [y/N] " CONFIRM
case "$CONFIRM" in
  [yY]|[yY][eE][sS]) ;;
  *) echo "Aborted."; exit 0 ;;
esac

railway init --name "$PROJECT_NAME" 2>/dev/null || railway link

echo ""
echo "Add PostgreSQL and Redis to this project (Railway dashboard → + New → Database)."
read -r -p "Press Enter when Postgres and Redis are added..."

echo ""
echo "Link API service to this repo (monorepo root, Dockerfile apps/api/Dockerfile)."
echo "Railway reads railway.toml for build/deploy settings."
read -r -p "Press Enter when the API service is connected to GitHub..."

echo ""
echo "Generate JWT secrets (save output — unique per environment):"
bash scripts/deploy/generate-secrets.sh

echo ""
echo "Set these variables on the API service (Railway → Variables):"
cat <<EOF
  DATABASE_URL=\${{Postgres.DATABASE_URL}}
  REDIS_URL=<from Redis plugin — REDIS_URL or REDIS_PRIVATE_URL>
  JWT_ACCESS_SECRET=<from generate-secrets output>
  JWT_REFRESH_SECRET=<from generate-secrets output>
  FRONTEND_ORIGIN=<set after Vercel deploy — see scripts/deploy/wire-cors.sh>
  PUBLIC_ADMIN_URL=<admin app URL>
  NODE_ENV=production
EOF

echo ""
echo "Do NOT set REDIS_USE_MEMORY in deployed environments."
echo ""

read -r -p "Enter DATABASE_URL to run migrations now (or press Enter to skip): " DB_URL
if [[ -n "$DB_URL" ]]; then
  DATABASE_URL="$DB_URL" bash scripts/deploy/migrate.sh
  read -r -p "Seed database? [y/N] " SEED
  case "$SEED" in
    [yY]|[yY][eE][sS])
      DATABASE_URL="$DB_URL" pnpm --filter @kloqra/api exec prisma db seed
      ;;
  esac
fi

echo ""
read -r -p "Enter public API URL for smoke test (or press Enter to skip): " API_URL
if [[ -n "$API_URL" ]]; then
  bash scripts/deploy/smoke.sh "$API_URL"
fi

echo ""
echo "=== Railway ${ENV_NAME} setup complete ==="
echo "Next: bash scripts/deploy/setup-vercel.sh ${ENV_NAME} <API_URL>"
