#!/usr/bin/env bash
# Deploy the coffee-shop Serverless stack after local checks.
# Usage (from repo root, Git Bash on Windows):
#   export JWT_SECRET=... JWT_ISSUER=... JWT_AUDIENCE=... API_CLIENT_ID=... API_CLIENT_SECRET=...
#   export AWS_REGION=us-east-1   # plus AWS credentials
#   ./scripts/deploy.sh [stage]   # stage defaults to dev
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
  echo "Export them (and AWS credentials) before running this script." >&2
  exit 1
fi

echo "Running typecheck and tests..."
npm run build
npm test

echo "Deploying stage=${STAGE} region=${REGION}..."
npx serverless deploy --stage "$STAGE" --region "$REGION"

echo "Done."
