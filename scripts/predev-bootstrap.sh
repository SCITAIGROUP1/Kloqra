#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/dev-bootstrap.sh
source "$ROOT/scripts/lib/dev-bootstrap.sh"

dev_bootstrap_root

mode="$(dev_bootstrap_read_mode)"
case "$mode" in
  native) script="local-native.sh" ;;
  docker | *) script="local-docker.sh" ;;
esac

DEV_BOOTSTRAP_QUIET=1 exec bash "$ROOT/scripts/$script" --quiet
