#!/bin/bash
# Schema Validator — compares column names in code vs actual DB schema
# Detects "column X does not exist" errors BEFORE they hit production.
# Cost: $0 (just curl + grep). Runs in heartbeat.
#
# Usage: ./scripts/schema-validator.sh [--json] [--verbose]
# Exit code: 0 if no mismatches, 1 if mismatches found

set -euo pipefail

API_URL="${LEADFLOW_API_URL:-https://api.imagineapi.org/rest/v1}"
API_KEY="${LEADFLOW_API_KEY:-}"
CODE_DIR="${LEADFLOW_CODE_DIR:-product/lead-response/dashboard/app/api}"
VERBOSE=false
JSON_OUTPUT=false

for arg in "$@"; do
  case $arg in
    --verbose) VERBOSE=true ;;
    --json) JSON_OUTPUT=true ;;
  esac
done

[ -z "$API_KEY" ] && echo '{"error":"LEADFLOW_API_KEY not set"}' && exit 1

MISMATCHES=()

# Get columns for a table from PostgREST
get_columns() {
  local table="$1"
  local resp
  resp=$(curl -s --max-time 5 "$API_URL/$table?select=*&limit=0" \
    -H "apikey: $API_KEY" \
    -H "Prefer: count=exact" \
    -D /dev/stdout -o /dev/null 2>/dev/null)

  # If table doesn't exist, PostgREST returns 404
  echo "$resp" | grep -q '404\|not found' && echo "TABLE_NOT_FOUND" && return

  # Get column names from a single row
  local row
  row=$(curl -s --max-time 5 "$API_URL/$table?select=*&limit=1" \
    -H "apikey: $API_KEY" 2>/dev/null)

  if echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(' '.join(d[0].keys()) if d else 'EMPTY')" 2>/dev/null; then
    return
  fi
  echo "EMPTY"
}

# Check a specific table's columns against code references
check_table() {
  local table="$1"
  local db_cols
  db_cols=$(get_columns "$table")

  [ "$db_cols" = "TABLE_NOT_FOUND" ] && return
  [ "$db_cols" = "EMPTY" ] && return

  # Find all .select(), .eq(), .insert(), .update() references to this table in code
  # Extract column names from patterns like .select('col1, col2') .eq('col', val)
  local code_cols
  code_cols=$(grep -rn "from('$table')" "$CODE_DIR" 2>/dev/null | \
    grep -oE "\.(select|eq|neq|gt|gte|lt|lte|is|in|not|order)\(['\"]([^'\"]+)" | \
    grep -oE "['\"][^'\"]+['\"]" | \
    tr -d "'" | tr -d '"' | \
    tr ',' '\n' | \
    sed 's/^ *//' | \
    grep -v '^\*$' | \
    grep -v '^\.' | \
    grep -vE '^(eq|neq|gt|gte|lt|lte|is|in|not|asc|desc|null|true|false)$' | \
    sort -u)

  for col in $code_cols; do
    # Skip if it's a PostgREST operator or value, not a column name
    [[ "$col" =~ ^[0-9] ]] && continue
    [[ "$col" =~ \. ]] && continue
    [ ${#col} -gt 50 ] && continue

    if ! echo "$db_cols" | grep -qw "$col"; then
      $VERBOSE && echo "  ❌ $table.$col — not in DB"
      MISMATCHES+=("{\"table\":\"$table\",\"column\":\"$col\"}")
    fi
  done
}

$VERBOSE && echo "Schema Validator"
$VERBOSE && echo "================================"

# Check key tables
TABLES="real_estate_agents leads sms_messages messages events sessions password_reset_tokens agent_integrations agent_profiles agent_page_views agent_sessions"

for table in $TABLES; do
  $VERBOSE && echo "Checking $table..."
  check_table "$table"
done

# Output
TOTAL=${#MISMATCHES[@]}

if $JSON_OUTPUT; then
  echo "{\"mismatches\":$TOTAL,\"details\":[$(IFS=,; echo "${MISMATCHES[*]}")]}"
else
  echo ""
  if [ $TOTAL -eq 0 ]; then
    echo "Schema validation passed — no mismatches found"
  else
    echo "Schema validation: $TOTAL column mismatches found"
  fi
fi

[ $TOTAL -eq 0 ] && exit 0 || exit 1
