#!/usr/bin/env bash
# Full CI parity before opening a PR (see docs/development/TESTING.md).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="${ROOT}/scripts/bin:${PATH:-}"

echo "→ format:check"
pnpm format:check

echo "→ lint"
pnpm -r --if-present lint

echo "→ typecheck"
pnpm -r --if-present typecheck

echo "→ unit tests (coverage)"
pnpm --filter @kloqra/contracts build
pnpm --filter @kloqra/web-shared build
pnpm --filter @kloqra/api test:coverage
pnpm --parallel --filter @kloqra/contracts --filter @kloqra/ui test -- --coverage
pnpm --parallel --filter @kloqra/web-shared --filter @kloqra/admin --filter @kloqra/client test

echo "→ build"
pnpm --filter @kloqra/ui build
pnpm --filter @kloqra/web-shared build
pnpm --filter @kloqra/api exec nest build
pnpm --filter @kloqra/admin exec next build
pnpm --filter @kloqra/client exec next build

echo "→ bundle budget"
node scripts/check-bundle-budget.mjs

echo "→ integration + browser e2e"
bash scripts/test-prepush.sh

echo "✓ Pre-PR gate passed"
