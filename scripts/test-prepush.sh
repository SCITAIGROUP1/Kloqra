#!/usr/bin/env bash
# Mirrors CI integration + e2e jobs (see .github/workflows/ci.yml).
# Prerequisites: Postgres (and Redis or REDIS_USE_MEMORY), migrate + seed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PNPM="${PNPM:-pnpm}"
if ! command -v pnpm >/dev/null 2>&1; then
  PNPM="corepack pnpm"
fi

export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:3001}"

echo "→ API integration"
$PNPM --filter @kloqra/api test:e2e

echo "→ Build workspace packages for browser e2e"
$PNPM --filter @kloqra/contracts --filter @kloqra/ui build

echo "→ Admin Playwright e2e (NEXT_PUBLIC_AUTH_SCOPE=admin)"
NEXT_PUBLIC_AUTH_SCOPE=admin $PNPM --filter @kloqra/admin test:e2e

echo "→ Client Playwright e2e (NEXT_PUBLIC_AUTH_SCOPE=client)"
NEXT_PUBLIC_AUTH_SCOPE=client $PNPM --filter @kloqra/client test:e2e

echo "✓ Pre-push test suite passed (matches CI integration + e2e)"
