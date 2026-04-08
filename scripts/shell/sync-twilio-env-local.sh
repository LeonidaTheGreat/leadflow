#!/bin/bash
set -euo pipefail

# =============================================================================
# Pull Twilio credentials from Vercel production into local .env.local
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="$ROOT_DIR/.env.local"
TMP_ENV="$(mktemp)"
TEAM_SCOPE="stojans-projects-7db98187"

cleanup() {
  rm -f "$TMP_ENV"
}
trap cleanup EXIT

echo "=============================================="
echo "Sync Twilio credentials into .env.local"
echo "=============================================="
echo ""

if ! command -v vercel >/dev/null 2>&1; then
  echo "Error: vercel CLI is not installed."
  echo "Install with: npm i -g vercel"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Error: not logged into Vercel."
  echo "Run: vercel login"
  exit 1
fi

echo "Pulling production env from Vercel..."
(
  cd "$ROOT_DIR"
  vercel env pull "$TMP_ENV" --yes --environment=production --scope "$TEAM_SCOPE" >/dev/null
)

required_keys=(
  "TWILIO_ACCOUNT_SID"
  "TWILIO_AUTH_TOKEN"
  "TWILIO_PHONE_NUMBER_US"
)

touch "$LOCAL_ENV"
updated_count=0

upsert_key() {
  local key="$1"
  local value="$2"
  local file="$3"
  local tmp_file
  tmp_file="$(mktemp)"

  awk -v k="$key" -v v="$value" '
    BEGIN { replaced = 0 }
    $0 ~ ("^" k "=") {
      print k "=" v
      replaced = 1
      next
    }
    { print }
    END {
      if (!replaced) print k "=" v
    }
  ' "$file" > "$tmp_file"

  mv "$tmp_file" "$file"
}

for key in "${required_keys[@]}"; do
  if ! grep -q "^${key}=" "$TMP_ENV"; then
    echo "Error: ${key} not found in Vercel production env."
    exit 1
  fi

  value="$(grep "^${key}=" "$TMP_ENV" | head -n 1 | cut -d '=' -f 2-)"
  if [ -z "$value" ]; then
    echo "Error: ${key} is empty in Vercel production env."
    exit 1
  fi

  upsert_key "$key" "$value" "$LOCAL_ENV"
  updated_count=$((updated_count + 1))
done

echo ""
echo "Updated $updated_count Twilio keys in $LOCAL_ENV"
echo "Run: node scripts/utilities/verify-twilio-env.js"
