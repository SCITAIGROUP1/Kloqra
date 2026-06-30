#!/usr/bin/env bash
# Shared local dev bootstrap — docker or native Postgres/Redis, env, migrate/seed when empty.
set -euo pipefail

DEV_BOOTSTRAP_QUIET="${DEV_BOOTSTRAP_QUIET:-0}"
DEV_BOOTSTRAP_INSTALL="${DEV_BOOTSTRAP_INSTALL:-0}"
DEV_BOOTSTRAP_MODE="${DEV_BOOTSTRAP_MODE:-docker}"
DEV_BOOTSTRAP_USE_DOCKER=0
DEV_BOOTSTRAP_MODE_FILE=".kloqra-deps-mode"

dev_bootstrap_root() {
  cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
}

dev_bootstrap_resolve_pnpm() {
  PNPM="${PNPM:-pnpm}"
  if ! command -v pnpm >/dev/null 2>&1; then
    PNPM="npx pnpm@9.15.0"
  fi
  export PNPM
}

dev_bootstrap_log() {
  [[ "$DEV_BOOTSTRAP_QUIET" == "1" ]] && return 0
  echo "$@"
}

dev_bootstrap_save_mode() {
  printf '%s\n' "$1" >"$DEV_BOOTSTRAP_MODE_FILE"
}

dev_bootstrap_read_mode() {
  if [[ -f "$DEV_BOOTSTRAP_MODE_FILE" ]]; then
    tr -d '[:space:]' <"$DEV_BOOTSTRAP_MODE_FILE"
    return 0
  fi
  echo "docker"
}

dev_bootstrap_port_open() {
  local port="$1"
  if command -v nc >/dev/null 2>&1; then
    nc -z localhost "$port" 2>/dev/null
    return
  fi
  (echo >/dev/tcp/localhost/"$port") 2>/dev/null
}

dev_bootstrap_psql_bin() {
  if command -v psql >/dev/null 2>&1; then
    command -v psql
    return 0
  fi
  local pg_app="/Applications/Postgres.app/Contents/Versions/latest/bin/psql"
  if [[ -x "$pg_app" ]]; then
    echo "$pg_app"
    return 0
  fi
  return 1
}

dev_bootstrap_createdb_bin() {
  if command -v createdb >/dev/null 2>&1; then
    command -v createdb
    return 0
  fi
  local pg_app="/Applications/Postgres.app/Contents/Versions/latest/bin/createdb"
  if [[ -x "$pg_app" ]]; then
    echo "$pg_app"
    return 0
  fi
  return 1
}

dev_bootstrap_pg_isready_bin() {
  if command -v pg_isready >/dev/null 2>&1; then
    command -v pg_isready
    return 0
  fi
  local pg_app="/Applications/Postgres.app/Contents/Versions/latest/bin/pg_isready"
  if [[ -x "$pg_app" ]]; then
    echo "$pg_app"
    return 0
  fi
  return 1
}

dev_bootstrap_docker_cli() {
  command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1
}

dev_bootstrap_docker_daemon() {
  dev_bootstrap_docker_cli && docker info >/dev/null 2>&1
}

dev_bootstrap_ensure_docker_daemon() {
  if dev_bootstrap_docker_daemon; then
    return 0
  fi
  if ! dev_bootstrap_docker_cli; then
    return 1
  fi

  dev_bootstrap_log "==> Waiting for Docker daemon..."
  if [[ "$(uname -s)" == "Darwin" ]] && [[ -d /Applications/Docker.app ]]; then
    open -a Docker 2>/dev/null || true
  fi

  for _ in {1..45}; do
    docker info >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

dev_bootstrap_cleanup_legacy_docker() {
  docker rm -f chronomint-postgres-1 chronomint-redis-1 2>/dev/null || true
  docker volume rm chronomint_pgdata 2>/dev/null || true
}

dev_bootstrap_pg_isready() {
  local pg_isready
  pg_isready="$(dev_bootstrap_pg_isready_bin)" || return 1
  dev_bootstrap_port_open 5432 && "$pg_isready" -h localhost -p 5432 -q 2>/dev/null
}

dev_bootstrap_docker_postgres_auth_ok() {
  dev_bootstrap_docker_daemon || return 1
  docker compose exec -T postgres psql -U kloqra -d kloqra -c 'SELECT 1' >/dev/null 2>&1
}

dev_bootstrap_wait_for_postgres() {
  for _ in {1..45}; do
    if dev_bootstrap_pg_isready; then
      return 0
    fi
    if [[ "$DEV_BOOTSTRAP_USE_DOCKER" == "1" ]] && dev_bootstrap_docker_daemon; then
      docker compose exec -T postgres pg_isready -U kloqra -q 2>/dev/null && return 0
    fi
    sleep 1
  done
  return 1
}

dev_bootstrap_reset_docker_volumes() {
  dev_bootstrap_log "==> Resetting Docker Postgres volume (recreating kloqra credentials)..."
  docker compose down -v 2>/dev/null || true
  dev_bootstrap_cleanup_legacy_docker
  docker compose up -d postgres redis
  DEV_BOOTSTRAP_USE_DOCKER=1
  dev_bootstrap_wait_for_postgres
}

dev_bootstrap_start_docker_deps() {
  dev_bootstrap_ensure_docker_daemon || return 1
  [[ -f docker-compose.yml ]] || return 1

  dev_bootstrap_cleanup_legacy_docker

  if ! docker compose ps postgres --status running -q 2>/dev/null | grep -q .; then
    dev_bootstrap_log "==> Starting Postgres + Redis via Docker Compose..."
    if ! docker compose up -d postgres redis 2>/tmp/kloqra-docker-up.err; then
      cat /tmp/kloqra-docker-up.err >&2
      rm -f /tmp/kloqra-docker-up.err
      return 1
    fi
    rm -f /tmp/kloqra-docker-up.err
  fi

  DEV_BOOTSTRAP_USE_DOCKER=1
  dev_bootstrap_wait_for_postgres || return 1

  if ! dev_bootstrap_docker_postgres_auth_ok; then
    dev_bootstrap_reset_docker_volumes
    dev_bootstrap_docker_postgres_auth_ok || return 1
  fi

  if ! dev_bootstrap_redis_ping; then
    if docker compose ps redis --status running -q 2>/dev/null | grep -q .; then
      for _ in {1..15}; do
        dev_bootstrap_redis_ping && break
        sleep 1
      done
    fi
  fi

  return 0
}

dev_bootstrap_redis_ping() {
  if command -v redis-cli >/dev/null 2>&1 && redis-cli -h localhost -p 6379 ping 2>/dev/null | grep -q PONG; then
    return 0
  fi
  for redis_cli in /opt/homebrew/bin/redis-cli /usr/local/bin/redis-cli; do
    if [[ -x "$redis_cli" ]] && "$redis_cli" -h localhost -p 6379 ping 2>/dev/null | grep -q PONG; then
      return 0
    fi
  done
  if [[ "$DEV_BOOTSTRAP_USE_DOCKER" == "1" ]] && dev_bootstrap_docker_daemon; then
    docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG && return 0
  fi
  return 1
}

dev_bootstrap_brew_bin() {
  if command -v brew >/dev/null 2>&1; then
    command -v brew
    return 0
  fi
  for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

dev_bootstrap_redis_server_bin() {
  if command -v redis-server >/dev/null 2>&1; then
    command -v redis-server
    return 0
  fi
  for candidate in /opt/homebrew/bin/redis-server /usr/local/bin/redis-server; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

dev_bootstrap_ensure_redis_native() {
  if dev_bootstrap_redis_ping; then
    dev_bootstrap_log "==> Redis ready on localhost:6379"
    return 0
  fi

  dev_bootstrap_log "==> Starting local Redis on localhost:6379..."

  local redis_server brew_bin
  if redis_server="$(dev_bootstrap_redis_server_bin)"; then
    "$redis_server" --daemonize yes --port 6379 --loglevel notice --save "" --appendonly no 2>/dev/null || true
  fi

  if ! dev_bootstrap_redis_ping && brew_bin="$(dev_bootstrap_brew_bin)"; then
    "$brew_bin" services start redis 2>/dev/null || true
  fi

  for _ in {1..20}; do
    if dev_bootstrap_redis_ping; then
      dev_bootstrap_log "==> Redis ready on localhost:6379"
      return 0
    fi
    sleep 1
  done

  echo "ERROR: Redis is not running on localhost:6379."
  echo "Install and start Redis, for example:"
  if brew_bin="$(dev_bootstrap_brew_bin)"; then
    echo "  $brew_bin install redis && $brew_bin services start redis"
  else
    echo "  brew install redis && brew services start redis"
  fi
  exit 1
}

dev_bootstrap_try_postgres_app() {
  local pg_isready
  pg_isready="$(dev_bootstrap_pg_isready_bin)" || return 1

  dev_bootstrap_log "==> Starting Postgres.app..."
  open -a Postgres 2>/dev/null || true
  for _ in {1..20}; do
    sleep 1
    dev_bootstrap_pg_isready && return 0
  done
  return 1
}

dev_bootstrap_ensure_postgres_docker() {
  if ! dev_bootstrap_start_docker_deps; then
    echo "ERROR: Docker Postgres + Redis could not be started."
    echo "Install Docker Desktop, ensure ports 5432 and 6379 are free, then run: pnpm local:docker"
    exit 1
  fi
}

dev_bootstrap_ensure_postgres_native() {
  if ! dev_bootstrap_pg_isready; then
    dev_bootstrap_try_postgres_app || true
  fi

  if ! dev_bootstrap_wait_for_postgres; then
    echo "ERROR: Local PostgreSQL is not running on localhost:5432."
    echo "Install Postgres.app or PostgreSQL, start the server, then run: pnpm local:native"
    exit 1
  fi

  local createdb
  createdb="$(dev_bootstrap_createdb_bin)" || return 0
  "$createdb" kloqra 2>/dev/null || true
}

dev_bootstrap_set_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    if [[ "$(uname -s)" == "Darwin" ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
  else
    printf '\n%s=%s\n' "$key" "$value" >>"$file"
  fi
}

dev_bootstrap_remove_env_var() {
  local file="$1"
  local key="$2"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' "/^${key}=/d" "$file"
  else
    sed -i "/^${key}=/d" "$file"
  fi
}

dev_bootstrap_patch_chronomint_env() {
  if grep -q chronomint apps/api/.env 2>/dev/null; then
    dev_bootstrap_log "==> Updating apps/api/.env (chronomint → kloqra)..."
    if [[ "$(uname -s)" == "Darwin" ]]; then
      sed -i '' 's/chronomint/kloqra/g' apps/api/.env
    else
      sed -i 's/chronomint/kloqra/g' apps/api/.env
    fi
  fi
}

dev_bootstrap_ensure_frontend_env_files() {
  for app in client admin; do
    local env_file="apps/$app/.env.local"
    if [[ ! -f "$env_file" ]]; then
      cp "apps/$app/.env.example" "$env_file"
      dev_bootstrap_log "==> Created $env_file"
    fi
  done
}

dev_bootstrap_configure_redis_env() {
  if dev_bootstrap_redis_ping; then
    dev_bootstrap_set_env_var apps/api/.env REDIS_URL "redis://localhost:6379"
    dev_bootstrap_remove_env_var apps/api/.env REDIS_USE_MEMORY
    return 0
  fi

  dev_bootstrap_log "==> Redis unavailable — using in-memory timer store (REDIS_USE_MEMORY=true)."
  dev_bootstrap_set_env_var apps/api/.env REDIS_USE_MEMORY "true"
  dev_bootstrap_remove_env_var apps/api/.env REDIS_URL
}

dev_bootstrap_native_database_url() {
  local psql url
  psql="$(dev_bootstrap_psql_bin)" || return 1

  local candidates=(
    "postgresql://kloqra:kloqra@localhost:5432/kloqra"
    "postgresql://${USER}@localhost:5432/kloqra"
  )

  for url in "${candidates[@]}"; do
    if "$psql" "$url" -c 'SELECT 1' >/dev/null 2>&1; then
      echo "$url"
      return 0
    fi
  done

  return 1
}

dev_bootstrap_ensure_env_files_docker() {
  if [[ ! -f apps/api/.env ]]; then
    cp apps/api/.env.example apps/api/.env
    dev_bootstrap_log "==> Created apps/api/.env"
  fi

  dev_bootstrap_patch_chronomint_env
  DEV_BOOTSTRAP_USE_DOCKER=1
  dev_bootstrap_set_env_var apps/api/.env DATABASE_URL "postgresql://kloqra:kloqra@localhost:5432/kloqra"
  dev_bootstrap_configure_redis_env
  dev_bootstrap_ensure_frontend_env_files
}

dev_bootstrap_ensure_env_files_native() {
  if [[ ! -f apps/api/.env ]]; then
    cp apps/api/.env.example apps/api/.env
    dev_bootstrap_log "==> Created apps/api/.env"
  fi

  dev_bootstrap_patch_chronomint_env

  local database_url
  if ! database_url="$(dev_bootstrap_native_database_url)"; then
    echo "ERROR: Could not connect to local database kloqra on localhost:5432."
    echo "Create it with: createdb kloqra"
    echo "Postgres.app usually uses: DATABASE_URL=postgresql://\${USER}@localhost:5432/kloqra"
    exit 1
  fi

  dev_bootstrap_set_env_var apps/api/.env DATABASE_URL "$database_url"
  dev_bootstrap_configure_redis_env
  dev_bootstrap_ensure_frontend_env_files
}

dev_bootstrap_ensure_install() {
  if [[ "$DEV_BOOTSTRAP_INSTALL" == "1" ]] || [[ ! -d node_modules ]]; then
    dev_bootstrap_log "==> Installing dependencies..."
    $PNPM install
  fi
}

dev_bootstrap_using_docker_deps() {
  dev_bootstrap_docker_daemon || return 1
  docker compose ps postgres --status running -q 2>/dev/null | grep -q .
}

dev_bootstrap_user_count() {
  if [[ "$DEV_BOOTSTRAP_MODE" == "docker" ]] && dev_bootstrap_using_docker_deps; then
    docker compose exec -T postgres psql -U kloqra -d kloqra -tAc 'SELECT COUNT(*) FROM users' 2>/dev/null || echo "0"
    return
  fi

  # shellcheck disable=SC1091
  set -a
  # shellcheck source=/dev/null
  source apps/api/.env
  set +a

  local psql
  psql="$(dev_bootstrap_psql_bin)" || {
    echo "0"
    return
  }
  "$psql" "$DATABASE_URL" -tAc 'SELECT COUNT(*) FROM users' 2>/dev/null || echo "0"
}

dev_bootstrap_ensure_database() {
  dev_bootstrap_log "==> Applying database migrations..."
  (cd apps/api && npx prisma migrate deploy)

  local user_count
  user_count="$(dev_bootstrap_user_count | tr -d '[:space:]')"
  if [[ -z "$user_count" ]] || [[ "$user_count" == "0" ]]; then
    dev_bootstrap_log "==> Seeding database (empty)..."
    $PNPM prisma:seed
  else
    dev_bootstrap_log "==> Database ready ($user_count users)."
  fi
}

dev_bootstrap_prep_docker() {
  dev_bootstrap_ensure_postgres_docker
  dev_bootstrap_ensure_env_files_docker
  dev_bootstrap_ensure_install
  dev_bootstrap_ensure_database
  dev_bootstrap_log "==> Generating Prisma client..."
  $PNPM prisma:generate
}

dev_bootstrap_prep_native() {
  dev_bootstrap_ensure_postgres_native
  if [[ "${DEV_BOOTSTRAP_REQUIRE_REDIS:-0}" == "1" ]]; then
    dev_bootstrap_ensure_redis_native
  fi
  dev_bootstrap_ensure_env_files_native
  dev_bootstrap_ensure_install
  dev_bootstrap_ensure_database
  dev_bootstrap_log "==> Generating Prisma client..."
  $PNPM prisma:generate
}

dev_bootstrap_prep() {
  case "$DEV_BOOTSTRAP_MODE" in
    native)
      dev_bootstrap_prep_native
      ;;
    docker | *)
      dev_bootstrap_prep_docker
      ;;
  esac
}

dev_bootstrap_run() {
  dev_bootstrap_prep
}

dev_bootstrap_print_dev_terminals() {
  [[ "$DEV_BOOTSTRAP_QUIET" == "1" ]] && return 0
  local mode_label="Docker (Postgres + Redis)"
  [[ "$DEV_BOOTSTRAP_MODE" == "native" ]] && mode_label="Native (local Postgres + Redis)"
  echo ""
  echo "==> Ready [$mode_label]. Pick one dev workflow:"
  echo ""
  echo "    Option 1 — all apps in one terminal:"
  echo "        pnpm dev:all"
  echo ""
  echo "    Option 2 — one app per terminal (run dev:shared first):"
  echo "        pnpm dev:shared    # terminal 1 — contracts + ui watch"
  echo "        pnpm dev:api       # terminal 2 — http://localhost:3001"
  echo "        pnpm dev:client    # terminal 3 — http://localhost:3000"
  echo "        pnpm dev:admin     # terminal 4 — http://localhost:3002"
  echo ""
  echo "    Split prep only (no apps): pnpm dev:split  (same as pnpm local)"
  echo "    Login: member@kloqra.dev / admin@kloqra.dev  password: password123"
  echo ""
}
