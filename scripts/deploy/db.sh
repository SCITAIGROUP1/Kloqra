#!/usr/bin/env bash
# Apply all migrations and seed demo data.
#
# Usage:
#   DATABASE_URL="postgresql://..." bash scripts/deploy/db.sh
#   bash scripts/deploy/db.sh postgresql://user:pass@host:5432/kloqra
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -n "${1:-}" ]]; then
  export DATABASE_URL="$1"
fi

bash "$ROOT/scripts/deploy/migrate.sh"
bash "$ROOT/scripts/deploy/seed.sh"
