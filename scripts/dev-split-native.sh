#!/usr/bin/env bash
# Native local dev — no Docker. Ensures Postgres + Redis, builds shared packages,
# then runs shared/api/client/admin watchers in the background.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/dev-bootstrap.sh
source "$ROOT/scripts/lib/dev-bootstrap.sh"

RUN_DIR="$ROOT/.local-serve"
DEV_NAMES=(shared api client admin)
DEV_COMMANDS=(dev:shared dev:api dev:client dev:admin)
DEV_PORTS=("" 3001 3000 3002)
DEV_URLS=("" "http://localhost:3001" "http://localhost:3000" "http://localhost:3002")

usage() {
  cat <<EOF
Usage: $(basename "$0") <start|stop|status|restart|logs> [options]

Native local dev (no Docker). Ensures Postgres + Redis, builds shared packages,
then runs all apps in the background.

Commands:
  start     Prep, build, and start all apps (default)
  stop      Stop background dev processes
  status    Show PIDs and port health
  restart   Stop then start
  logs      Tail logs (all apps, or one: logs api)

Options:
  --install   Run pnpm install during prep

URLs:
  Client  http://localhost:3000
  API     http://localhost:3001
  Admin   http://localhost:3002

Login: member@kloqra.dev / admin@kloqra.dev  password: password123
EOF
}

dev_split_export_path() {
  export PATH="/usr/local/bin:/opt/homebrew/bin:${PATH:-}"
}

dev_split_pnpm_exec() {
  dev_bootstrap_resolve_pnpm
  if command -v pnpm >/dev/null 2>&1; then
    echo pnpm
    return 0
  fi
  echo "npx pnpm@9.15.0"
}

dev_split_pid_alive() {
  local pidfile="$1"
  [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null
}

dev_split_stop_one() {
  local name="$1"
  local pidfile="$RUN_DIR/${name}.pid"
  if dev_split_pid_alive "$pidfile"; then
    kill "$(cat "$pidfile")" 2>/dev/null || true
    sleep 1
    if dev_split_pid_alive "$pidfile"; then
      kill -9 "$(cat "$pidfile")" 2>/dev/null || true
    fi
    dev_bootstrap_log "==> stopped $name"
  fi
  rm -f "$pidfile"
}

cmd_stop() {
  dev_bootstrap_root
  mkdir -p "$RUN_DIR"
  local name
  for name in "${DEV_NAMES[@]}"; do
    dev_split_stop_one "$name"
  done
}

dev_split_start_one() {
  local name="$1"
  local pnpm_exec="$2"
  local cmd="$3"
  local log="$RUN_DIR/${name}.log"
  local pidfile="$RUN_DIR/${name}.pid"

  if dev_split_pid_alive "$pidfile"; then
    dev_bootstrap_log "==> $name already running (pid $(cat "$pidfile"))"
    return 0
  fi

  : >"$log"
  nohup bash -c "cd \"$ROOT\" && export PATH=\"/usr/local/bin:/opt/homebrew/bin:\$PATH\" && exec $pnpm_exec $cmd" >>"$log" 2>&1 &
  echo $! >"$pidfile"
  disown 2>/dev/null || true
  dev_bootstrap_log "==> started $name (pid $(cat "$pidfile"), log: .local-serve/${name}.log)"
}

dev_split_wait_for_port() {
  local port="$1"
  local label="$2"
  for _ in $(seq 1 45); do
    if lsof -i ":$port" 2>/dev/null | grep -q LISTEN; then
      return 0
    fi
    sleep 1
  done
  echo "ERROR: $label did not start on port $port — check .local-serve/${label}.log"
  return 1
}

cmd_start() {
  local install=0
  local arg
  for arg in "$@"; do
    case "$arg" in
      --install) install=1 ;;
      -h | --help)
        usage
        exit 0
        ;;
    esac
  done

  dev_bootstrap_root
  dev_split_export_path
  dev_bootstrap_resolve_pnpm
  mkdir -p "$RUN_DIR"

  DEV_BOOTSTRAP_MODE=native
  DEV_BOOTSTRAP_REQUIRE_REDIS=1
  [[ "$install" == "1" ]] && DEV_BOOTSTRAP_INSTALL=1
  dev_bootstrap_save_mode native

  dev_bootstrap_log "==> Kloqra native split serve — Postgres + Redis + build + dev"
  dev_bootstrap_run

  dev_bootstrap_log "==> Building shared packages..."
  $PNPM --filter @kloqra/contracts build
  $PNPM --filter @kloqra/ui build
  $PNPM --filter @kloqra/web-shared build

  local pnpm_exec
  pnpm_exec="$(dev_split_pnpm_exec)"

  dev_split_start_one shared "$pnpm_exec" dev:shared
  sleep 5
  dev_split_start_one api "$pnpm_exec" dev:api
  dev_split_start_one client "$pnpm_exec" dev:client
  dev_split_start_one admin "$pnpm_exec" dev:admin

  dev_bootstrap_log "==> Waiting for app ports..."
  dev_split_wait_for_port 3001 api
  dev_split_wait_for_port 3000 client
  dev_split_wait_for_port 3002 admin

  echo ""
  cmd_status
}

cmd_status() {
  dev_bootstrap_root
  mkdir -p "$RUN_DIR"

  local i name port url pidfile
  echo "==> Native split dev status"
  for i in "${!DEV_NAMES[@]}"; do
    name="${DEV_NAMES[$i]}"
    port="${DEV_PORTS[$i]}"
    url="${DEV_URLS[$i]}"
    pidfile="$RUN_DIR/${name}.pid"

    if dev_split_pid_alive "$pidfile"; then
      printf "  %-7s running (pid %s)" "$name" "$(cat "$pidfile")"
    else
      printf "  %-7s stopped" "$name"
    fi

    if [[ -n "$port" ]]; then
      if lsof -i ":$port" 2>/dev/null | grep -q LISTEN; then
        printf "  :%s listening" "$port"
      else
        printf "  :%s down" "$port"
      fi
      if command -v curl >/dev/null 2>&1; then
        local code
        code="$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo '---')"
        printf "  http=%s" "$code"
      fi
      printf "  %s" "$url"
    fi
    echo ""
  done
  echo ""
  echo "Logs: .local-serve/{shared,api,client,admin}.log"
  echo "Stop: pnpm serve:split:stop"
}

cmd_logs() {
  dev_bootstrap_root
  mkdir -p "$RUN_DIR"
  local target="${1:-all}"
  case "$target" in
    shared | api | client | admin)
      tail -f "$RUN_DIR/${target}.log"
      ;;
    all | *)
      tail -f "$RUN_DIR"/*.log
      ;;
  esac
}

main() {
  local cmd="${1:-start}"
  shift || true
  case "$cmd" in
    start | up) cmd_start "$@" ;;
    stop | down) cmd_stop ;;
    status) cmd_status ;;
    restart) cmd_stop; cmd_start "$@" ;;
    logs) cmd_logs "${1:-all}" ;;
    -h | --help | help)
      usage
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
