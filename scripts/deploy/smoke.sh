#!/usr/bin/env bash
# Post-deploy smoke checks for the Kloqra API.
#
# Usage:
#   bash scripts/deploy/smoke.sh https://your-api.example.com
#   API_URL=https://... bash scripts/deploy/smoke.sh
set -euo pipefail

API_URL="${1:-${API_URL:-}}"
if [[ -z "$API_URL" ]]; then
  echo "usage: bash scripts/deploy/smoke.sh <API_BASE_URL>" >&2
  echo "   or: API_URL=https://... bash scripts/deploy/smoke.sh" >&2
  exit 1
fi

API_URL="${API_URL%/}"
HEALTH_URL="${API_URL}/health"

echo "Checking ${HEALTH_URL}..."
RESPONSE="$(curl -sfS --max-time 30 "$HEALTH_URL")"

if command -v jq >/dev/null 2>&1; then
  STATUS="$(echo "$RESPONSE" | jq -r '.status // empty')"
  if [[ "$STATUS" != "ok" ]]; then
    echo "error: health check returned unexpected body: $RESPONSE" >&2
    exit 1
  fi
  echo "Health OK: $(echo "$RESPONSE" | jq -c .)"
else
  echo "$RESPONSE" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' || {
    echo "error: health check failed: $RESPONSE" >&2
    exit 1
  }
  echo "Health OK: $RESPONSE"
fi

echo ""
echo "API smoke passed. Manual checks:"
echo "  1. Admin login → Dashboard"
echo "  2. Client login → Start timer"
echo "  3. Admin Team live shows activity"
echo "  4. Admin Export download works"
