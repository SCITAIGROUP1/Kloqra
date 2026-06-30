#!/usr/bin/env bash
# Ensures Postgres/Redis, migrations, and seed data exist before browser e2e.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/dev-bootstrap.sh
source "$ROOT/scripts/lib/dev-bootstrap.sh"

if [[ "${CI:-}" == "true" ]] || [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  # GitHub Actions e2e job provides Postgres/Redis services and runs migrate + seed.
  exit 0
fi

dev_bootstrap_root
dev_bootstrap_resolve_pnpm

DEV_BOOTSTRAP_QUIET=1

case "$(dev_bootstrap_read_mode)" in
  native) dev_bootstrap_prep_native ;;
  docker | *) dev_bootstrap_prep_docker ;;
esac
