#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/dev-bootstrap.sh
source "$ROOT/scripts/lib/dev-bootstrap.sh"

dev_bootstrap_root
dev_bootstrap_resolve_pnpm

for arg in "$@"; do
  case "$arg" in
    --quiet) DEV_BOOTSTRAP_QUIET=1 ;;
    --install) DEV_BOOTSTRAP_INSTALL=1 ;;
  esac
done

DEV_BOOTSTRAP_MODE=native
dev_bootstrap_save_mode native

dev_bootstrap_log "==> Kloqra local prep — Native (local Postgres + Redis)"
dev_bootstrap_run
dev_bootstrap_print_dev_terminals
