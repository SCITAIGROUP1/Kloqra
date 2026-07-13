#!/usr/bin/env bash
# Mirrors CI integration + e2e jobs (see .github/workflows/ci.yml).
# Prerequisites: Postgres (and Redis or REDIS_USE_MEMORY), migrate + seed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PNPM="${PNPM:-bash "$ROOT/scripts/pnpm-wrap.sh"}"

export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:3001}"
export CLIENT_COMMERCIAL_FEATURES_ENABLED="${CLIENT_COMMERCIAL_FEATURES_ENABLED:-true}"
export NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES="${NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES:-true}"

echo "→ migrate + seed (CI parity)"
$PNPM prisma:generate
$PNPM --filter @kloqra/api exec prisma migrate deploy
$PNPM build --filter=@kloqra/contracts
$PNPM prisma:seed

echo "→ API integration"
$PNPM --filter @kloqra/api test:e2e

echo "→ Build workspace packages for browser e2e"
$PNPM --filter @kloqra/contracts --filter @kloqra/ui --filter @kloqra/web-shared build

echo "→ Resetting database to clean seeded state for Playwright tests"
$PNPM --filter @kloqra/api prisma:seed

echo "→ Admin Playwright e2e (NEXT_PUBLIC_AUTH_SCOPE=admin)"
NEXT_PUBLIC_AUTH_SCOPE=admin $PNPM --filter @kloqra/admin test:e2e

echo "→ Client Playwright e2e (NEXT_PUBLIC_AUTH_SCOPE=client)"
NEXT_PUBLIC_AUTH_SCOPE=client $PNPM --filter @kloqra/client test:e2e

echo "→ Platform-admin Playwright e2e"
$PNPM --filter @kloqra/platform-admin test:e2e

echo "✓ Pre-push test suite passed (matches CI integration + e2e)"
