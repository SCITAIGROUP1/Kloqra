#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PNPM="${PNPM:-pnpm}"
if ! command -v pnpm >/dev/null 2>&1; then
  PNPM="npx pnpm@9.15.0"
fi

echo "==> Kloqra serve (no Docker)"

# Postgres
PG_ISREADY=""
for bin in pg_isready "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_isready"; do
  if command -v "$bin" >/dev/null 2>&1 || [[ -x "$bin" ]]; then
    PG_ISREADY="$bin"
    break
  fi
done

if [[ -n "$PG_ISREADY" ]] && ! "$PG_ISREADY" -h localhost -p 5432 -q 2>/dev/null; then
  echo "==> Starting Postgres.app..."
  open -a Postgres 2>/dev/null || true
  for _ in {1..15}; do
    sleep 1
    "$PG_ISREADY" -h localhost -p 5432 -q 2>/dev/null && break
  done
fi

if [[ -n "$PG_ISREADY" ]] && ! "$PG_ISREADY" -h localhost -p 5432 -q 2>/dev/null; then
  echo "ERROR: PostgreSQL is not running on localhost:5432."
  echo "Start Postgres.app or install PostgreSQL, then retry."
  exit 1
fi

# Env
if [[ ! -f apps/api/.env ]]; then
  cp apps/api/.env.example apps/api/.env
  echo "==> Created apps/api/.env — set DATABASE_URL to your Postgres user if login fails."
fi

for app in client admin; do
  if [[ ! -f "apps/$app/.env.local" ]]; then
    echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:3001" > "apps/$app/.env.local"
  fi
done

echo "==> Installing dependencies..."
$PNPM install

echo "==> Building shared packages..."
$PNPM --filter @kloqra/contracts build
$PNPM --filter @kloqra/ui build
$PNPM prisma:generate

echo "==> Applying migrations..."
(cd apps/api && npx prisma migrate deploy)

echo "==> Seeding database..."
$PNPM prisma:seed || true

echo ""
echo "==> Starting apps..."
echo "    Client  http://localhost:3000"
echo "    Admin   http://localhost:3002"
echo "    API     http://localhost:3001"
echo "    Login:  member@kloqra.dev / admin@kloqra.dev  password: password123"
echo ""

exec $PNPM dev
