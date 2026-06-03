#!/bin/sh
set -e
cd /app

# Railway may inject PG* vars when Postgres is linked; prefer explicit DATABASE_URL.
if [ -z "${DATABASE_URL:-}" ] && [ -n "${PGHOST:-}" ] && [ -n "${PGPASSWORD:-}" ]; then
  export DATABASE_URL="postgresql://${PGUSER:-postgres}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE:-railway}"
  echo "Built DATABASE_URL from PGHOST/PG* variables."
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL is empty in this container." >&2
  echo "This is ChronoMint's startup check — not a Railway platform error." >&2
  echo "Fix: open your API service → Variables → add DATABASE_URL via 'Reference' from Postgres." >&2
  echo "  Example: DATABASE_URL=\${{Postgres.DATABASE_URL}}  (Postgres = your DB service name, case-sensitive)" >&2
  echo "  Or paste the full postgresql:// URL, save, then redeploy the API." >&2
  echo "Diagnostics: PGHOST=${PGHOST:-<unset>} PGPORT=${PGPORT:-<unset>} PGDATABASE=${PGDATABASE:-<unset>}" >&2
  exit 1
fi

if [ -x ./node_modules/.bin/prisma ]; then
  echo "Running prisma migrate deploy..."
  ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
fi

exec node dist/main.js
