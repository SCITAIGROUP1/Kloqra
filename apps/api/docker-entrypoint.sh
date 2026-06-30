#!/bin/sh
set -e
cd /app

strip_quotes() {
  value="$1"
  case "$value" in
    \"*\") value="${value#\"}"; value="${value%\"}" ;;
    \'*\') value="${value#\'}"; value="${value%\'}" ;;
  esac
  printf '%s' "$value"
}

resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    DATABASE_URL="$(strip_quotes "$DATABASE_URL")"
    export DATABASE_URL
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
  # Prisma reads process.env and optional .env next to the schema at runtime.
  printf '%s\n' "DATABASE_URL=${DATABASE_URL}" > /app/prisma/.env
  if [ -x ./node_modules/.bin/prisma ]; then
    echo "Running prisma migrate deploy..."
    set +e
    ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
    migrate_status=$?
    set -e
    if [ "$migrate_status" -ne 0 ]; then
      echo "WARN: prisma migrate deploy exited with status ${migrate_status}" >&2
    fi
  fi
else
  echo "WARN: No database URL in this container." >&2
  echo "Railway: API service → Variables → DATABASE_URL → Deploy (Apply changes)." >&2
  echo "Diagnostics: RAILWAY_ENVIRONMENT=${RAILWAY_ENVIRONMENT:-unset} RAILWAY_SERVICE_NAME=${RAILWAY_SERVICE_NAME:-unset}" >&2
  echo "DB-related env keys: $(env | grep -E '^(DATABASE|POSTGRES|PG)' | cut -d= -f1 | tr '\n' ' ' || echo none)" >&2
fi

if [ -f /app/prisma/.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /app/prisma/.env
  set +a
fi

exec /usr/bin/env node dist/main.js
