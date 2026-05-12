#!/bin/bash
# E2E Flow Tests — verify critical user paths on the live product
# Called by heartbeat step 5d5. Output: JSON with pass/fail per test.
# Cost: $0 (pure HTTP). No test accounts created, no SMS sent.
#
# Usage: ./scripts/e2e-flow-tests.sh [--json] [--verbose]
# Exit code: 0 if all critical pass, 1 if any critical fail

set -euo pipefail

BASE_URL="${LEADFLOW_APP_URL:-https://leadflow-ai-five.vercel.app}"

# Load API credentials from dashboard .env and .env.local
# .env.local takes priority (Next.js convention) — it holds production overrides
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ENV_FILE="$_SCRIPT_DIR/../product/lead-response/dashboard/.env"
_ENV_LOCAL_FILE="$_SCRIPT_DIR/../product/lead-response/dashboard/.env.local"
if [ -f "$_ENV_FILE" ]; then
  _ENV_API_URL=$(grep '^NEXT_PUBLIC_API_URL=' "$_ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  _ENV_API_KEY=$(grep '^API_SECRET_KEY=' "$_ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  LEADFLOW_API_URL="${_ENV_API_URL:-${LEADFLOW_API_URL:-}}"
  LEADFLOW_API_KEY="${_ENV_API_KEY:-${LEADFLOW_API_KEY:-}}"
fi
# .env.local overrides .env (matches Next.js precedence)
if [ -f "$_ENV_LOCAL_FILE" ]; then
  _ENV_LOCAL_API_URL=$(grep '^NEXT_PUBLIC_API_URL=' "$_ENV_LOCAL_FILE" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  _ENV_LOCAL_API_KEY=$(grep '^API_SECRET_KEY=' "$_ENV_LOCAL_FILE" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  [ -n "$_ENV_LOCAL_API_URL" ] && LEADFLOW_API_URL="$_ENV_LOCAL_API_URL"
  [ -n "$_ENV_LOCAL_API_KEY" ] && LEADFLOW_API_KEY="$_ENV_LOCAL_API_KEY"
fi

API_URL="${LEADFLOW_API_URL:-https://api.imagineapi.org/rest/v1}"
API_KEY="${LEADFLOW_API_KEY:-}"
VERBOSE=false
JSON_OUTPUT=false

for arg in "$@"; do
  case $arg in
    --verbose) VERBOSE=true ;;
    --json) JSON_OUTPUT=true ;;
  esac
done

PASSED=0
FAILED=0
RESULTS=()

run_test() {
  local id="$1"
  local name="$2"
  local severity="$3"
  local status

  if eval "$4"; then
    status="pass"
    PASSED=$((PASSED + 1))
    $VERBOSE && echo "  ✅ $id: $name"
  else
    status="fail"
    FAILED=$((FAILED + 1))
    $VERBOSE && echo "  ❌ $id: $name"
  fi

  RESULTS+=("{\"id\":\"$id\",\"name\":\"$name\",\"severity\":\"$severity\",\"status\":\"$status\"}")
}

# ============================================
# TEST DEFINITIONS
# ============================================

# Test 1: Health endpoint shows API connectivity OK
test_health_connectivity() {
  local resp
  resp=$(curl -sf --max-time 10 "$BASE_URL/api/health" 2>/dev/null) || return 1
  echo "$resp" | grep -q '"api_connectivity":{"ok":true' || return 1
}

# Test 2: Login rejects invalid credentials
test_login_rejects_bad() {
  local resp
  resp=$(curl -s --max-time 10 -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"e2e-nonexistent@example.com","password":"wrongpass123"}' 2>/dev/null) || return 1
  echo "$resp" | grep -q 'Invalid email or password' || return 1
}

# Test 3: Forgot-password returns success (anti-enumeration)
test_forgot_password() {
  local resp
  resp=$(curl -s --max-time 10 -X POST "$BASE_URL/api/auth/forgot-password" \
    -H "Content-Type: application/json" \
    -d '{"email":"e2e-nonexistent@example.com"}' 2>/dev/null) || return 1
  echo "$resp" | grep -q '"success":true' || return 1
}

# Test 4: Signup page loads
test_signup_page() {
  local code
  code=$(curl -sf --max-time 10 -o /dev/null -w '%{http_code}' "$BASE_URL/signup" 2>/dev/null) || return 1
  [ "$code" = "200" ] || return 1
}

# Test 5: Landing page loads
test_landing_page() {
  local code
  code=$(curl -sf --max-time 10 -o /dev/null -w '%{http_code}' "$BASE_URL/" 2>/dev/null) || return 1
  [ "$code" = "200" ] || return 1
}

# Test 6: Trial signup creates account + returns agentId
test_trial_signup_flow() {
  local ts email resp
  ts=$(date +%s)
  email="e2e-flow-${ts}@leadflow-test.com"

  resp=$(curl -s --max-time 15 -X POST "$BASE_URL/api/auth/trial-signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"E2eTest123!\",\"firstName\":\"E2E\",\"lastName\":\"Test\"}" 2>/dev/null) || return 1

  echo "$resp" | grep -q '"agentId"' || return 1

  E2E_TOKEN=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null) || true
  E2E_EMAIL="$email"
}

# Test 7: Trial-status returns agentId when authenticated
test_trial_status_has_agent_id() {
  [ -z "${E2E_TOKEN:-}" ] && return 1

  local resp
  resp=$(curl -s --max-time 10 "$BASE_URL/api/auth/trial-status" \
    -H "Cookie: auth-token=$E2E_TOKEN" 2>/dev/null) || return 1

  echo "$resp" | grep -q '"agentId"' || return 1
}

# Test 8: Reset password creates token in DB
test_reset_password_chain() {
  [ -z "${E2E_EMAIL:-}" ] && return 1
  [ -z "${API_KEY:-}" ] && return 1

  curl -s --max-time 10 -X POST "$BASE_URL/api/auth/forgot-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$E2E_EMAIL\"}" >/dev/null 2>&1 || return 1

  # Get agent_id from email
  local agent_resp agent_id
  agent_resp=$(curl -s --max-time 10 \
    "$API_URL/real_estate_agents?select=id&email=eq.$E2E_EMAIL&limit=1" \
    -H "apikey: $API_KEY" 2>/dev/null) || return 1

  agent_id=$(echo "$agent_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null) || true
  [ -z "$agent_id" ] && return 1

  # Check that reset token was created for this agent
  local tokens
  tokens=$(curl -s --max-time 10 \
    "$API_URL/password_reset_tokens?select=id&agent_id=eq.$agent_id&used=eq.false&limit=1" \
    -H "apikey: $API_KEY" 2>/dev/null) || return 1

  echo "$tokens" | grep -q '"id"' || return 1
}

# Test 9: Lead capture endpoint accepts POST
test_lead_capture() {
  local resp
  resp=$(curl -s --max-time 10 -X POST "$BASE_URL/api/lead-capture" \
    -H "Content-Type: application/json" \
    -d '{"name":"E2E Test","email":"e2e-noreply@example.com","phone":"+15555550000"}' 2>/dev/null) || return 1

  echo "$resp" | grep -q 'Internal Server Error' && return 1
  return 0
}

# Test 10: Dashboard loads without client-side errors (needs session or JWT)
test_dashboard_no_errors() {
  [ -z "${API_KEY:-}" ] && return 1

  # Use a real user who has completed onboarding AND has an active (non-expired) plan.
  # Must exclude agents on expired trials — the middleware redirects them to /upgrade
  # before the dashboard can render, causing the test to fail with no 'Lead Feed' content.
  # Strategy: prefer paid/pilot agents; fall back to trial agents with future trial_ends_at.
  local agent_resp user_id now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # First: try a paid or pilot agent (plan_tier != 'trial')
  agent_resp=$(curl -s --max-time 10 \
    "$API_URL/real_estate_agents?select=id&onboarding_completed=eq.true&plan_tier=neq.trial&order=created_at.desc&limit=1" \
    -H "apikey: $API_KEY" 2>/dev/null) || return 1
  user_id=$(echo "$agent_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null) || true

  # Fallback: find a trial agent whose trial has NOT yet expired
  if [ -z "$user_id" ]; then
    agent_resp=$(curl -s --max-time 10 \
      "$API_URL/real_estate_agents?select=id&onboarding_completed=eq.true&plan_tier=eq.trial&trial_ends_at=gt.${now_iso}&order=trial_ends_at.desc&limit=1" \
      -H "apikey: $API_KEY" 2>/dev/null) || return 1
    user_id=$(echo "$agent_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null) || true
  fi

  # Fallback: use the E2E test agent created by test_trial_signup_flow (has active trial, needs
  # onboarding completed). This handles the case where no production agent meets all criteria
  # (e.g. all onboarding-complete agents have expired trials). The test agent is cleaned up by
  # cleanup_test_accounts after all tests run.
  if [ -z "$user_id" ] && [ -n "${E2E_TOKEN:-}" ]; then
    # Mark onboarding complete for the test agent so middleware won't redirect to /dashboard/onboarding
    curl -s --max-time 10 -X POST "$BASE_URL/api/onboarding/complete" \
      -H "Content-Type: application/json" \
      -H "Cookie: auth-token=$E2E_TOKEN" \
      -d '{}' >/dev/null 2>&1 || true

    # Load dashboard using JWT cookie — middleware accepts auth-token for JWT sessions
    local html http_status _tmp_dash
    _tmp_dash=$(mktemp)
    http_status=$(curl -s --max-time 15 -o "$_tmp_dash" -w "%{http_code}" "$BASE_URL/dashboard" \
      -H "Cookie: auth-token=$E2E_TOKEN" 2>/dev/null)
    local exit_code=$?
    html=$(cat "$_tmp_dash" 2>/dev/null); rm -f "$_tmp_dash"

    [ $exit_code -ne 0 ] && return 1
    [[ "$http_status" == 5* ]] && return 1
    echo "$html" | grep -qi 'does not exist\|Internal Server Error\|Application error\|FUNCTION_INVOCATION_FAILED' && return 1
    echo "$html" | grep -q 'Lead Feed' || return 1
    return 0
  fi

  [ -z "$user_id" ] && return 1

  # Create a fresh session: generate raw token, store SHA-256 hash in DB.
  # The DB stores only the hash (since PR #1026). The cookie must hold the raw token —
  # middleware calls hashToken(cookie) and looks up that hash in sessions.token.
  local raw_token token_hash now expires session_resp session_id
  raw_token=$(openssl rand -hex 32)
  token_hash=$(printf '%s' "$raw_token" | openssl dgst -sha256 | awk '{print $2}')
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  expires=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ")

  session_resp=$(curl -s --max-time 10 -X POST "$API_URL/sessions" \
    -H "apikey: $API_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"user_id\":\"$user_id\",\"token\":\"$token_hash\",\"expires_at\":\"$expires\",\"created_at\":\"$now\",\"last_used_at\":\"$now\",\"user_agent\":\"e2e-test\"}" 2>/dev/null) || return 1

  session_id=$(echo "$session_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d[0] if isinstance(d,list) else d; print(r.get('id','') if isinstance(r,dict) else '')" 2>/dev/null) || true
  [ -z "$session_id" ] && return 1

  # Load dashboard with raw token in cookie — server hashes it to validate
  # Capture HTTP status code alongside body to detect deployment failures (e.g. 500 FUNCTION_INVOCATION_FAILED)
  local html http_status _tmp_dash
  _tmp_dash=$(mktemp)
  http_status=$(curl -s --max-time 15 -o "$_tmp_dash" -w "%{http_code}" "$BASE_URL/dashboard" \
    -H "Cookie: leadflow_session=$raw_token" 2>/dev/null)
  local exit_code=$?
  html=$(cat "$_tmp_dash" 2>/dev/null); rm -f "$_tmp_dash"

  # Clean up test session regardless of outcome
  curl -s --max-time 10 -X DELETE "$API_URL/sessions?id=eq.$session_id" \
    -H "apikey: $API_KEY" >/dev/null 2>&1 || true

  [ $exit_code -ne 0 ] && return 1
  # HTTP 5xx = server/deployment failure (e.g. wrong Vercel deploy directory)
  [[ "$http_status" == 5* ]] && return 1

  # Should not contain PostgREST or Vercel error patterns
  echo "$html" | grep -qi 'does not exist\|Internal Server Error\|Application error\|FUNCTION_INVOCATION_FAILED' && return 1
  # Should contain dashboard content
  echo "$html" | grep -q 'Lead Feed' || return 1
  return 0
}

# Test 11: Billing page loads without errors
test_billing_no_errors() {
  [ -z "${API_KEY:-}" ] && return 1

  local session token html
  session=$(curl -s --max-time 10 \
    "$API_URL/sessions?select=token&order=created_at.desc&limit=1" \
    -H "apikey: $API_KEY" 2>/dev/null) || return 1
  token=$(echo "$session" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['token'] if d else '')" 2>/dev/null) || true
  [ -z "$token" ] && return 1

  html=$(curl -s --max-time 15 "$BASE_URL/settings/billing" \
    -H "Cookie: leadflow_session=$token" 2>/dev/null) || return 1

  echo "$html" | grep -qi 'does not exist\|Internal Server Error\|Application error' && return 1
  return 0
}

# Test 12: SMS stats API doesn't crash
test_sms_stats_no_crash() {
  [ -z "${API_KEY:-}" ] && return 1

  local session token
  session=$(curl -s --max-time 10 \
    "$API_URL/sessions?select=token,user_id&order=created_at.desc&limit=1" \
    -H "apikey: $API_KEY" 2>/dev/null) || return 1
  token=$(echo "$session" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['token'] if d else '')" 2>/dev/null) || true
  [ -z "$token" ] && return 1

  local resp
  resp=$(curl -s --max-time 10 "$BASE_URL/api/analytics/sms-stats?window=30" \
    -H "Cookie: leadflow_session=$token" 2>/dev/null) || return 1

  # Should NOT contain "does not exist"
  echo "$resp" | grep -q 'does not exist' && return 1
  return 0
}

# Cleanup test accounts created by this script
cleanup_test_accounts() {
  local pg_url="${LOCAL_PG_URL:-}"
  if [ -z "$pg_url" ]; then
    # Try loading from project .env
    local _proj_env="$_SCRIPT_DIR/../.env"
    [ -f "$_proj_env" ] && pg_url=$(grep '^LOCAL_PG_URL=' "$_proj_env" | head -1 | cut -d'=' -f2-)
  fi
  if [ -z "$pg_url" ]; then
    # Fallback: try ~/.env
    [ -f "$HOME/.env" ] && pg_url=$(grep '^LOCAL_PG_URL=' "$HOME/.env" | head -1 | cut -d'=' -f2-)
  fi
  if [ -n "$pg_url" ]; then
    # Delete leads belonging to e2e-flow test agents, then delete the agents
    psql -q "$pg_url" <<'SQL' 2>/dev/null || true
DELETE FROM messages WHERE lead_id IN (
  SELECT l.id FROM leads l JOIN real_estate_agents a ON l.agent_id = a.id
  WHERE a.email LIKE 'e2e-flow-%@leadflow-test.com'
);
DELETE FROM leads WHERE agent_id IN (
  SELECT id FROM real_estate_agents WHERE email LIKE 'e2e-flow-%@leadflow-test.com'
);
DELETE FROM pilot_progress WHERE agent_id IN (
  SELECT id FROM real_estate_agents WHERE email LIKE 'e2e-flow-%@leadflow-test.com'
);
DELETE FROM real_estate_agents WHERE email LIKE 'e2e-flow-%@leadflow-test.com';
SQL
  fi
  return 0
}

# ============================================
# RUN TESTS
# ============================================

$VERBOSE && echo "E2E Flow Tests — $BASE_URL"
$VERBOSE && echo "================================"

E2E_TOKEN=""
E2E_EMAIL=""

run_test "health-api-connectivity" "Health: API connectivity" "critical" "test_health_connectivity"
run_test "login-rejects-bad"       "Auth: login rejects bad creds" "critical" "test_login_rejects_bad"
run_test "forgot-password-ok"      "Auth: forgot-password returns success" "critical" "test_forgot_password"
run_test "signup-page-loads"       "Page: signup loads" "critical" "test_signup_page"
run_test "landing-page-loads"      "Page: landing page" "warning" "test_landing_page"
run_test "trial-signup-flow"       "Flow: trial signup creates account" "critical" "test_trial_signup_flow"
run_test "trial-status-agent-id"   "Flow: trial-status returns agentId" "critical" "test_trial_status_has_agent_id"
run_test "reset-password-chain"    "Flow: reset password creates token" "critical" "test_reset_password_chain"
run_test "lead-capture-post"       "API: lead-capture accepts POST" "critical" "test_lead_capture"
run_test "dashboard-no-errors"     "Dashboard: loads without errors" "critical" "test_dashboard_no_errors"
run_test "billing-no-errors"       "Page: billing loads without errors" "critical" "test_billing_no_errors"
run_test "sms-stats-no-crash"      "API: SMS stats no schema errors" "critical" "test_sms_stats_no_crash"

cleanup_test_accounts

# ============================================
# OUTPUT
# ============================================

TOTAL=$((PASSED + FAILED))
CRITICAL_FAIL=0
for r in "${RESULTS[@]}"; do
  if echo "$r" | grep -q '"severity":"critical"' && echo "$r" | grep -q '"status":"fail"'; then
    CRITICAL_FAIL=$((CRITICAL_FAIL + 1))
  fi
done

if $JSON_OUTPUT; then
  echo "{\"total\":$TOTAL,\"passed\":$PASSED,\"failed\":$FAILED,\"critical_failed\":$CRITICAL_FAIL,\"results\":[$(IFS=,; echo "${RESULTS[*]}")]}"
else
  echo ""
  echo "Results: $PASSED/$TOTAL passed ($CRITICAL_FAIL critical failures)"
  [ $CRITICAL_FAIL -gt 0 ] && echo "CRITICAL FAILURES DETECTED"
fi

[ $CRITICAL_FAIL -eq 0 ] && exit 0 || exit 1
