#!/usr/bin/env bash
# Bootstrap Vercel staging or production projects for client and admin apps.
#
# Prerequisites:
#   - Vercel CLI: npm i -g vercel && vercel login
#
# Usage:
#   bash scripts/deploy/setup-vercel.sh staging https://your-staging-api.railway.app
#   bash scripts/deploy/setup-vercel.sh production https://api.example.com
set -euo pipefail

ENV_NAME="${1:-}"
API_URL="${2:-}"

if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ]]; then
  echo "usage: bash scripts/deploy/setup-vercel.sh <staging|production> <API_BASE_URL>" >&2
  exit 1
fi

if [[ -z "$API_URL" ]]; then
  echo "error: API_BASE_URL is required as second argument" >&2
  exit 1
fi

API_URL="${API_URL%/}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if ! command -v vercel >/dev/null 2>&1; then
  if [[ -f "$ROOT/node_modules/.bin/vercel" ]]; then
    vercel() { "$ROOT/node_modules/.bin/vercel" "$@"; }
  else
    echo "error: vercel CLI not found. Run: pnpm install (includes vercel)" >&2
    exit 1
  fi
fi

VERCEL_SCOPE="${VERCEL_SCOPE:-production}"
if [[ "$ENV_NAME" == "staging" ]]; then
  CLIENT_PROJECT="kloqra-client-staging"
  ADMIN_PROJECT="kloqra-admin-staging"
else
  CLIENT_PROJECT="kloqra-client"
  ADMIN_PROJECT="kloqra-admin"
fi

setup_app() {
  local app_dir="$1"
  local project_name="$2"
  local auth_scope="$3"
  local admin_url="${4:-}"

  echo ""
  echo "=== Setting up ${project_name} (${app_dir}) ==="
  cd "${ROOT}/${app_dir}"

  vercel link --yes --project "$project_name" 2>/dev/null || vercel link

  echo "$API_URL" | vercel env add NEXT_PUBLIC_API_BASE_URL "$VERCEL_SCOPE" --force
  echo "$auth_scope" | vercel env add NEXT_PUBLIC_AUTH_SCOPE "$VERCEL_SCOPE" --force

  if [[ -n "$admin_url" ]]; then
    echo "$admin_url" | vercel env add NEXT_PUBLIC_ADMIN_URL "$VERCEL_SCOPE" --force
  fi

  echo "Deploying ${project_name}..."
  vercel deploy --prod
}

echo "=== Kloqra Vercel setup: ${ENV_NAME} ==="
echo "API URL: ${API_URL}"
echo ""
echo "Ensure each Vercel project has:"
echo "  - Root Directory: apps/client or apps/admin"
echo "  - Include source files outside Root Directory: ON"
echo ""

read -r -p "Continue with Vercel CLI setup? [y/N] " CONFIRM
case "$CONFIRM" in
  [yY]|[yY][eE][sS]) ;;
  *) echo "Manual setup: see docs/runbooks/vercel.md"; exit 0 ;;
esac

setup_app "apps/client" "$CLIENT_PROJECT" "client"

ADMIN_URL=""
if [[ "$ENV_NAME" == "staging" ]]; then
  ADMIN_URL="https://${ADMIN_PROJECT}.vercel.app"
else
  read -r -p "Admin public URL (for share links, e.g. https://admin.example.com): " ADMIN_URL
  ADMIN_URL="${ADMIN_URL:-https://${ADMIN_PROJECT}.vercel.app}"
fi

setup_app "apps/admin" "$ADMIN_PROJECT" "admin" "$ADMIN_URL"

CLIENT_URL="https://${CLIENT_PROJECT}.vercel.app"
echo ""
echo "=== Wire CORS on Railway API ==="
echo "FRONTEND_ORIGIN=$(bash "${ROOT}/scripts/deploy/wire-cors.sh" "$CLIENT_URL" "$ADMIN_URL")"
echo ""
echo "Update FRONTEND_ORIGIN on the Railway API service, then run:"
echo "  bash scripts/deploy/smoke.sh ${API_URL}"
