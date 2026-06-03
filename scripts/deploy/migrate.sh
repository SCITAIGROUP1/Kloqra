#!/usr/bin/env bash
# Run Prisma migrations against a remote database (staging or production).
#
# Usage:
#   DATABASE_URL="postgresql://..." bash scripts/deploy/migrate.sh
#   bash scripts/deploy/migrate.sh postgresql://user:pass@host:5432/chronomint
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -n "${1:-}" ]]; then
  export DATABASE_URL="$1"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "error: DATABASE_URL is required (env var or first argument)" >&2
  exit 1
fi

echo "Running prisma migrate deploy..."
pnpm install --frozen-lockfile --filter @chronomint/api...
pnpm --filter @chronomint/api prisma:generate
pnpm --filter @chronomint/api exec prisma migrate deploy
echo "Migrations applied successfully."
