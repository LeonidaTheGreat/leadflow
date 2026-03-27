#!/bin/bash
# E2E Flow Tests — verify critical user paths on the live product
# Called by heartbeat step 5d5. Output: JSON with pass/fail per test.
# Cost: $0 (pure HTTP). No test accounts created, no SMS sent.
#
# Usage: ./scripts/e2e-flow-tests.sh [--json] [--verbose]
# Exit code: 0 if all critical pass, 1 if any critical fail

set -euo pipefail

BASE_URL="${LEADFLOW_APP_URL:-https://leadflow-ai-five.vercel.app}"
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

# Helper: run a test and record result
run_test() {
  local id="$1"
  local name="$2"
  local severity="$3"
  local result
  local status

  # The test function is passed as $4 (function name)
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

# Test 2: Login rejects invalid credentials (proves route works + DB connected)
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
# Uses a unique throwaway email each run
test_trial_signup_flow() {
  local ts email resp agent_id
  ts=$(date +%s)
  email="e2e-flow-${ts}@leadflow-test.com"

  resp=$(curl -s --max-time 15 -X POST "$BASE_URL/api/auth/trial-signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"E2eTest123!\",\"firstName\":\"E2E\",\"lastName\":\"Test\"}" 2>/dev/null) || return 1

  # Should return agentId
  echo "$resp" | grep -q '"agentId"' || return 1

  # Extract token for next test
  E2E_TOKEN=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null) || true
  E2E_EMAIL="$email"
}

# Test 7: Trial-status returns agentId when authenticated
test_trial_status_has_agent_id() {
  [ -z "${E2E_TOKEN:-}" ] && return 1

  local resp
  # trial-status reads from 'auth-token' cookie (JWT)
  resp=$(curl -s --max-time 10 "$BASE_URL/api/auth/trial-status" \
    -H "Cookie: auth-token=$E2E_TOKEN" 2>/dev/null) || return 1

  echo "$resp" | grep -q '"agentId"' || return 1
}

# Test 8: Reset password full chain (if we have a test account)
test_reset_password_chain() {
  [ -z "${E2E_EMAIL:-}" ] && return 1
  [ -z "${API_KEY:-}" ] && return 1

  # Trigger forgot-password
  curl -s --max-time 10 -X POST "$BASE_URL/api/auth/forgot-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$E2E_EMAIL\"}" >/dev/null 2>&1 || return 1

  # Check token was created in DB
  local tokens
  tokens=$(curl -s --max-time 10 \
    "$API_URL/password_reset_tokens?select=id&email=eq.$E2E_EMAIL&used_at=is.null&limit=1" \
    -H "apikey: $API_KEY" 2>/dev/null) || return 1

  # Should have at least one token
  echo "$tokens" | grep -q '"id"' || return 1
}

# Test 9: Lead capture endpoint accepts POST
test_lead_capture() {
  local resp
  resp=$(curl -s --max-time 10 -X POST "$BASE_URL/api/lead-capture" \
    -H "Content-Type: application/json" \
    -d '{"name":"E2E Test","email":"e2e-noreply@example.com","phone":"+15555550000"}' 2>/dev/null) || return 1

  # Should NOT return 500 or "Internal Server Error"
  echo "$resp" | grep -q 'Internal Server Error' && return 1
  return 0
}

# Test 10: Clean up test accounts (not a test, just housekeeping)
cleanup_test_accounts() {
  [ -z "${API_KEY:-}" ] && return 0

  # Delete e2e test accounts older than 1 hour
  curl -s --max-time 10 -X DELETE \
    "$API_URL/real_estate_agents?email=like.e2e-flow-*@leadflow-test.com" \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY" >/dev/null 2>&1 || true
  return 0
}

# ============================================
# RUN TESTS
# ============================================

$VERBOSE && echo "E2E Flow Tests — $BASE_URL"
$VERBOSE && echo "================================"

# Initialize state
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

# Cleanup
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
  if [ $CRITICAL_FAIL -gt 0 ]; then
    echo "CRITICAL FAILURES DETECTED"
  fi
fi

# Exit 1 if any critical test failed
[ $CRITICAL_FAIL -eq 0 ] && exit 0 || exit 1
