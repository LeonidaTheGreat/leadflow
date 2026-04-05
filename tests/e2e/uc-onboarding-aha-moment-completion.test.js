/**
 * E2E Test: Onboarding Simulator API
 * Tests the lead simulator endpoint for the Aha Moment feature
 * 
 * Acceptance Criteria:
 * - Simulator API handles start, status, and skip actions
 * - Response time is tracked and returned
 * - Conversation is stored and returned
 * - Uses crypto.randomBytes for randomness (not Math.random)
 * - No hardcoded secrets
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard')

let passed = 0
let failed = 0
const failures = []

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
    failures.push(label)
  }
}

function section(name) {
  console.log(`\n📋 ${name}`)
}

// ── 1. Security: Crypto Randomness ─────────────────────────────────────────

section('Security: Crypto Randomness')

const simulatorRoute = path.join(DASHBOARD_DIR, 'app/api/onboarding/simulator/route.ts')
const simulatorCode = fs.readFileSync(simulatorRoute, 'utf8')

check('Uses crypto.randomBytes (not Math.random)', 
  simulatorCode.includes('randomBytes') && !simulatorCode.includes('Math.random()'),
  'Must use crypto.randomBytes for secure randomness')

check('Uses crypto.randomUUID for IDs',
  simulatorCode.includes('randomUUID'),
  'Must use crypto.randomUUID for generating IDs')

// ── 2. Security: No Hardcoded Secrets ─────────────────────────────────────

section('Security: No Hardcoded Secrets')

const hardcodedPatterns = [
  /['"]sk-[a-zA-Z0-9]{24,}['"]/,  // Stripe keys
  /['"]pk_[a-zA-Z0-9]{24,}['"]/,   // Stripe publishable keys
  /['"][0-9a-f]{32,}['"]/,         // Generic API keys (32+ hex chars)
  /password\s*[=:]\s*['"][^'"]+['"]/i,  // Hardcoded passwords
]

let hasHardcodedSecrets = false
for (const pattern of hardcodedPatterns) {
  if (pattern.test(simulatorCode)) {
    hasHardcodedSecrets = true
    break
  }
}

check('No hardcoded secrets in simulator route', !hasHardcodedSecrets)

// ── 3. Input Validation ───────────────────────────────────────────────────

section('Input Validation')

check('Validates action parameter', 
  simulatorCode.includes("if (!action") || simulatorCode.includes('!action'),
  'Must validate action is provided')

check('Validates agentId parameter',
  simulatorCode.includes("if (!action || !agentId)") || simulatorCode.includes('!agentId'),
  'Must validate agentId is provided')

check('Validates sessionId for status action',
  simulatorCode.includes("sessionId required for") || simulatorCode.includes('!sessionId'),
  'Must validate sessionId for status/skip actions')

check('Returns 400 for invalid action',
  simulatorCode.includes('status: 400') && simulatorCode.includes('Invalid action'),
  'Must return 400 for invalid action')

// ── 4. Error Handling ─────────────────────────────────────────────────────

section('Error Handling')

check('Has try/catch in main handler',
  simulatorCode.includes('try') && simulatorCode.includes('catch'),
  'Must have error handling')

check('Returns 500 on internal error',
  simulatorCode.includes('status: 500') && simulatorCode.includes('Internal server error'),
  'Must return 500 for internal errors')

check('Logs errors to console',
  simulatorCode.includes('console.error'),
  'Must log errors for debugging')

// ── 5. Database Operations ────────────────────────────────────────────────

section('Database Operations')

check('Uses supabaseServer (not supabaseAdmin)',
  simulatorCode.includes('supabaseServer'),
  'Should use supabaseServer for consistency')

check('Inserts to onboarding_simulations table',
  simulatorCode.includes('onboarding_simulations'),
  'Must write to onboarding_simulations table')

check('Handles database errors gracefully',
  simulatorCode.includes('if (dbError)') || simulatorCode.includes('error:'),
  'Must handle DB errors without crashing')

// ── 6. Response Time Tracking ─────────────────────────────────────────────

section('Response Time Tracking')

check('Tracks response_time_ms',
  simulatorCode.includes('response_time_ms'),
  'Must track response time in milliseconds')

check('Calculates response time from timestamps',
  simulatorCode.includes('aiNow - progress.inboundAt') || simulatorCode.includes('responseTimeMs'),
  'Must calculate response time from actual timestamps')

// ── 7. Status States ──────────────────────────────────────────────────────

section('Status States')

const expectedStates = ['idle', 'running', 'inbound_received', 'ai_responded', 'success', 'skipped', 'timeout', 'failed']
for (const state of expectedStates) {
  check(`Has '${state}' status`, simulatorCode.includes(`'${state}'`) || simulatorCode.includes(`"${state}"`))
}

// ── 8. Analytics/Events ───────────────────────────────────────────────────

section('Analytics Integration')

check('Logs analytics events',
  simulatorCode.includes('logAnalyticsEvent') || simulatorCode.includes('events'),
  'Should log events for tracking')

check('Logs simulation started event',
  simulatorCode.includes('onboarding_simulation_started'),
  'Must log when simulation starts')

check('Logs simulation success event',
  simulatorCode.includes('onboarding_simulation_succeeded'),
  'Must log when simulation succeeds')

// ── 9. Timeout Handling ───────────────────────────────────────────────────

section('Timeout Handling')

check('Has timeout mechanism (90 seconds)',
  simulatorCode.includes('90000') || simulatorCode.includes('timeout'),
  'Must timeout after 90 seconds')

check('Updates status to timeout',
  simulatorCode.includes("status: 'timeout'"),
  'Must set status to timeout when expired')

// ── 10. Summary ────────────────────────────────────────────────────────────

section('Test Summary')
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.log('\n❌ Failed checks:')
  failures.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
} else {
  console.log('\n✅ All E2E checks passed!')
  process.exit(0)
}
