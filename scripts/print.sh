#!/usr/bin/env bash
# Print the fully resolved Serverless configuration (no AWS deploy).
# Usage:
#   export JWT_SECRET=... JWT_ISSUER=... JWT_AUDIENCE=... API_CLIENT_ID=... API_CLIENT_SECRET=...
#   ./scripts/print.sh [stage]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAGE="${1:-${STAGE:-dev}}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"

missing=()
for v in JWT_SECRET JWT_ISSUER JWT_AUDIENCE API_CLIENT_ID API_CLIENT_SECRET; do
  if [[ -z "${!v:-}" ]]; then
    missing+=("$v")
  fi
done
if ((${#missing[@]} > 0)); then
  echo "Missing required environment variables: ${missing[*]}" >&2
  exit 1
fi

npx serverless print --stage "$STAGE" --region "$REGION"
