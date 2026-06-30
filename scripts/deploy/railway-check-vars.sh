#!/usr/bin/env bash
# Print which database-related variables Railway has on the linked API service.
# Requires: railway CLI logged in and linked to the API service.
#
#   bash scripts/deploy/railway-check-vars.sh
#   bash scripts/deploy/railway-check-vars.sh production

set -euo pipefail

ENV_NAME="${1:-production}"

if ! command -v railway >/dev/null 2>&1; then
  echo "Install Railway CLI: https://docs.railway.com/develop/cli" >&2
  exit 1
fi

echo "==> Rendered variables for environment: ${ENV_NAME}"
echo "    (DATABASE_URL should appear with a postgres:// value, not empty)"
echo ""

railway variables --environment "${ENV_NAME}" 2>/dev/null | grep -E '^(DATABASE|POSTGRES|PG|REDIS)' || {
  echo "No DATABASE/POSTGRES/PG/REDIS variables found on this linked service."
  echo "Link the API service: cd apps/api && railway link"
  echo "Then add DATABASE_URL via Reference from Postgres in the dashboard."
  exit 1
}
