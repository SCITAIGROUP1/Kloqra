#!/usr/bin/env bash
# Generate JWT secrets for staging or production API deployment.
# Each environment must use unique values — never reuse across staging/prod.
set -euo pipefail

gen() {
  openssl rand -base64 48 | tr -d '/+=' | head -c 48
}

echo "# Paste into Railway API service variables (unique per environment)"
echo "JWT_ACCESS_SECRET=$(gen)"
echo "JWT_REFRESH_SECRET=$(gen)"
