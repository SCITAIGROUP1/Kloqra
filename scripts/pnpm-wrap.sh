#!/usr/bin/env bash
# Use corepack when pnpm is not on PATH (local shells without global pnpm install).
set -euo pipefail
if command -v pnpm >/dev/null 2>&1; then
  pnpm_path="$(command -v pnpm)"
  if [[ "$pnpm_path" != *"/scripts/bin/pnpm" ]]; then
    exec pnpm "$@"
  fi
fi
exec corepack pnpm "$@"
