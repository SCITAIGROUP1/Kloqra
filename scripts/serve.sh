#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/dev-bootstrap.sh
source "$ROOT/scripts/lib/dev-bootstrap.sh"

dev_bootstrap_root

mode="$(dev_bootstrap_read_mode)"
case "$mode" in
  native) exec bash "$ROOT/scripts/local-native.sh" --install "$@" ;;
  docker | *) exec bash "$ROOT/scripts/local-docker.sh" --install "$@" ;;
esac
