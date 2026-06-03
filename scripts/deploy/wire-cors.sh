#!/usr/bin/env bash
# Print FRONTEND_ORIGIN value for Railway API after Vercel frontends are deployed.
#
# Usage:
#   bash scripts/deploy/wire-cors.sh https://client.vercel.app https://admin.vercel.app
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: bash scripts/deploy/wire-cors.sh <CLIENT_URL> <ADMIN_URL> [EXTRA_URL...]" >&2
  exit 1
fi

ORIGINS=()
for url in "$@"; do
  url="${url%/}"
  ORIGINS+=("$url")
done

IFS=,
echo "${ORIGINS[*]}"
echo ""
echo "Set this as FRONTEND_ORIGIN on the API service, then redeploy or restart."
