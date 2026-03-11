/**
 * Tests: fix-twilio-number-provisioning-not-implemented
 * Task ID: 7d9ae449-39ad-465d-bfcc-745c7f87115b
 *
 * Verifies:
 *  1. /api/agents/onboarding/provision-phone endpoint exists and is correctly structured
 *  2. Endpoint validates inputs (missing agent id, bad area code)
 *  3. Endpoint calls Twilio IncomingPhoneNumbers API (not a sentinel store)
 *  4. Frontend no longer sends 0000000000 as a placeholder for system numbers
 *  5. /api/integrations/twilio/connect rejects the 0000000000 sentinel
 *
 * These tests are static-analysis + logic tests (no live Twilio calls needed).
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')

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
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function section(name) {
  console.log(`\n📋 ${name}`)
}

// ── 1. Provision-phone route exists ─────────────────────────────────────────

section('provision-phone route: file existence')

const provisionRoutePath = path.join(
  DASHBOARD_DIR,
  'app/api/agents/onboarding/provision-phone/route.ts'
)
check('provision-phone route.ts exists', fs.existsSync(provisionRoutePath))

const provisionRoute = fs.existsSync(provisionRoutePath)
  ? fs.readFileSync(provisionRoutePath, 'utf8')
  : ''

// ── 2. Provision-phone route: key implementation checks ─────────────────────

section('provision-phone route: implementation')

check(
  'Exports POST handler',
  provisionRoute.includes('export async function POST'),
  'Must export a POST handler'
)

check(
  'Reads x-agent-id header',
  provisionRoute.includes("x-agent-id"),
  'Agent ID must come from header, not body'
)

check(
  'Returns 400 when x-agent-id missing',
  provisionRoute.includes('Missing x-agent-id') || provisionRoute.includes("'x-agent-id'"),
  'Must validate agent-id presence'
)

check(
  'Validates area code format (3 digits)',
  provisionRoute.includes('areaCode') && provisionRoute.includes('3'),
  'Should validate area code is 3 digits'
)

check(
  'Reads TWILIO_ACCOUNT_SID from env',
  provisionRoute.includes('TWILIO_ACCOUNT_SID'),
  'Must use LeadFlow Twilio credentials'
)

check(
  'Reads TWILIO_AUTH_TOKEN from env',
  provisionRoute.includes('TWILIO_AUTH_TOKEN'),
  'Must use LeadFlow Twilio credentials'
)

check(
  'Returns 503 when Twilio credentials missing',
  provisionRoute.includes('503') && provisionRoute.includes('credentials'),
  'Must surface config error properly'
)

check(
  'Calls availablePhoneNumbers to search',
  provisionRoute.includes('availablePhoneNumbers') || provisionRoute.includes('available_phone_numbers'),
  'Must search Twilio for an available number'
)

check(
  'Calls incomingPhoneNumbers.create to purchase',
  provisionRoute.includes('incomingPhoneNumbers.create') || provisionRoute.includes('incoming_phone_numbers'),
  'Must actually purchase (provision) the number via Twilio API'
)

check(
  'Upserts provisioned number into agent_integrations',
  provisionRoute.includes('agent_integrations') && provisionRoute.includes('upsert'),
  'Must persist the real phone number to DB'
)

check(
  'Enables SMS in agent_settings',
  provisionRoute.includes('agent_settings') && provisionRoute.includes('sms_enabled'),
  'Must enable SMS for the agent after provisioning'
)

check(
  'Returns success with real phone number',
  provisionRoute.includes('phoneNumber') && provisionRoute.includes('success: true'),
  'Must return the provisioned E.164 number'
)

check(
  'Does NOT store 0000000000 placeholder',
  !provisionRoute.includes('0000000000'),
  'Sentinel value must not appear in provisioning logic'
)

check(
  'Has fallback when area code yields no results',
  provisionRoute.includes('areaCode') && provisionRoute.match(/Fall back|fallback|without area/i),
  'Should fall back to a broader search if area code has no numbers'
)

// ── 3. Frontend: no longer sends 0000000000 for system mode ─────────────────

section('Frontend twilio.tsx: system mode fix')

const twilioStepPath = path.join(DASHBOARD_DIR, 'app/setup/steps/twilio.tsx')
const twilioStep = fs.existsSync(twilioStepPath)
  ? fs.readFileSync(twilioStepPath, 'utf8')
  : ''

check(
  'Calls /api/agents/onboarding/provision-phone for system mode',
  twilioStep.includes('/api/agents/onboarding/provision-phone'),
  'Frontend must call the new provision endpoint for system-number mode'
)

check(
  'No longer sends 0000000000 sentinel in system mode',
  !twilioStep.match(/mode\s*===\s*['"]system['"].*0000000000|0000000000.*mode\s*===\s*['"]system['"]/s),
  'Frontend must not send the 0000000000 placeholder'
)

check(
  'Separate fetch calls for system vs existing modes',
  twilioStep.includes("mode === 'system'") || twilioStep.includes('mode === "system"'),
  'System and existing modes should use different endpoints'
)

// ── 4. Connect route: rejects 0000000000 sentinel ───────────────────────────

section('connect route: rejects 0000000000 sentinel')

const connectRoutePath = path.join(
  DASHBOARD_DIR,
  'app/api/integrations/twilio/connect/route.ts'
)
const connectRoute = fs.existsSync(connectRoutePath)
  ? fs.readFileSync(connectRoutePath, 'utf8')
  : ''

check(
  'Connect route rejects 0000000000',
  connectRoute.includes('0000000000'),
  'Must explicitly block the sentinel value'
)

check(
  'Returns 400 for sentinel',
  connectRoute.includes('0000000000') && connectRoute.includes('400'),
  'Must return HTTP 400 for the placeholder'
)

check(
  'Points to provision-phone endpoint in error message',
  connectRoute.includes('provision-phone'),
  'Error message should guide client to the correct endpoint'
)

// ── 5. Summary ───────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60))
console.log('📊 TEST SUMMARY')
console.log('═'.repeat(60))
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Pass rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

if (failures.length > 0) {
  console.log('\n❌ Failures:')
  failures.forEach((f) => console.log(`  • ${f}`))
}

console.log('═'.repeat(60))

if (failed > 0) {
  process.exit(1)
}
