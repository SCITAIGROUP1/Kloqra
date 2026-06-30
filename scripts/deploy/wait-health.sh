#!/usr/bin/env bash
# Poll GET /health until status ok or timeout.
#
# Usage:
#   bash scripts/deploy/wait-health.sh https://api.example.com
#   API_URL=https://... MAX_WAIT_SEC=600 bash scripts/deploy/wait-health.sh
set -euo pipefail

API_URL="${1:-${API_URL:-}}"
if [[ -z "$API_URL" ]]; then
  echo "usage: bash scripts/deploy/wait-health.sh <API_BASE_URL>" >&2
  exit 1
fi

API_URL="${API_URL%/}"
HEALTH_URL="${API_URL}/health"
MAX_WAIT_SEC="${MAX_WAIT_SEC:-600}"
INTERVAL_SEC="${INTERVAL_SEC:-10}"
INITIAL_DELAY_SEC="${INITIAL_DELAY_SEC:-0}"

if [[ "$INITIAL_DELAY_SEC" -gt 0 ]]; then
  echo "Waiting ${INITIAL_DELAY_SEC}s before health checks (platform deploy warm-up)..."
  sleep "$INITIAL_DELAY_SEC"
fi

deadline=$((SECONDS + MAX_WAIT_SEC))
attempt=0

while [[ $SECONDS -lt $deadline ]]; do
  attempt=$((attempt + 1))
  if RESPONSE="$(curl -sfS --max-time 15 "$HEALTH_URL" 2>/dev/null)"; then
    if command -v jq >/dev/null 2>&1; then
      STATUS="$(echo "$RESPONSE" | jq -r '.status // empty')"
      if [[ "$STATUS" == "ok" ]]; then
        echo "Health OK after ${attempt} attempt(s): $(echo "$RESPONSE" | jq -c .)"
        exit 0
      fi
    elif echo "$RESPONSE" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'; then
      echo "Health OK after ${attempt} attempt(s): $RESPONSE"
      exit 0
    fi
  fi
  echo "Attempt ${attempt}: not ready (${HEALTH_URL}), retry in ${INTERVAL_SEC}s..."
  sleep "$INTERVAL_SEC"
done

echo "error: API did not become healthy within ${MAX_WAIT_SEC}s (${HEALTH_URL})" >&2
exit 1
