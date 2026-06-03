#!/bin/sh
set -e
cd /app

resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    return 0
  fi

  if [ -n "${PGHOST:-}" ] && [ -n "${PGPASSWORD:-}" ]; then
    export DATABASE_URL="postgresql://${PGUSER:-postgres}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE:-railway}"
    echo "Built DATABASE_URL from PGHOST/PG* variables."
    return 0
  fi

  for candidate in DATABASE_PRIVATE_URL DATABASE_PUBLIC_URL POSTGRES_URL POSTGRESQL_URL; do
    eval "value=\${$candidate:-}"
    if [ -n "$value" ]; then
      export DATABASE_URL="$value"
      echo "Using ${candidate} as DATABASE_URL."
      return 0
    fi
  done

  return 1
}

if resolve_database_url; then
  echo "DATABASE_URL configured (${#DATABASE_URL} characters)."
  if [ -x ./node_modules/.bin/prisma ]; then
    echo "Running prisma migrate deploy..."
    ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
  fi
else
  echo "WARN: No database URL in this container — API will start but DB routes will fail." >&2
  echo "Railway: API service → Variables → New Variable → Reference → pick Postgres → DATABASE_URL → Redeploy." >&2
  echo "Env keys present (values hidden): $(env | grep -E '^(DATABASE|POSTGRES|PG)' | cut -d= -f1 | tr '\n' ' ' || echo none)" >&2
fi

exec node dist/main.js
