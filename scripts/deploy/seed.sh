#!/usr/bin/env bash
# Run Prisma seed against a database (staging or local).
#
# Usage:
#   DATABASE_URL="postgresql://..." bash scripts/deploy/seed.sh
#   bash scripts/deploy/seed.sh postgresql://user:pass@host:5432/kloqra
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

echo "Running prisma migrate deploy (ensure schema is current)..."
pnpm install --frozen-lockfile --filter @kloqra/api...
pnpm --filter @kloqra/api prisma:generate
pnpm --filter @kloqra/api exec prisma migrate deploy

echo "Seeding database..."
pnpm --filter @kloqra/api prisma:seed
echo "Seed completed successfully."
