#!/usr/bin/env node
/**
 * E2E Test: sms-stats endpoint queries sms_messages (not messages)
 *
 * Bug fix: /api/analytics/sms-stats was querying the 'messages' table,
 * which lacks agent_id, causing 500 errors. Fixed to use 'sms_messages'.
 *
 * Test ID: fix-api-queries-wrong-table-sms-stats-endpoint-returns
 * Task:    139b3d9e-07e5-4be8-bea0-5b04108009e7
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}`)
    console.log(`     ${err.message}`)
    failed++
  }
}

const routePath = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts'
)

const routeSource = fs.readFileSync(routePath, 'utf8')

console.log('\n🔍 E2E: sms-stats API route — correct table & column usage\n')

// ── Table name check ────────────────────────────────────────────────────────
test('Route queries sms_messages table', () => {
  assert(
    routeSource.includes(".from('sms_messages')"),
    "Expected .from('sms_messages') in route source"
  )
})

test('Route does NOT query plain messages table', () => {
  // Must not contain .from('messages') without the sms_ prefix
  const hasWrongTable = /\.from\(['"]messages['"]\)/.test(routeSource)
  assert(!hasWrongTable, "Route must not query .from('messages') — wrong table (missing sms_ prefix)")
})

// ── Direction values (Twilio canonical) ─────────────────────────────────────
test('Outbound direction uses outbound-api (Twilio canonical)', () => {
  assert(
    routeSource.includes("'outbound-api'"),
    "Expected direction 'outbound-api' (Twilio value)"
  )
})

test('Does not use plain outbound direction string (missing -api suffix)', () => {
  // Must not filter direction === 'outbound' (without -api suffix)
  const hasWrongDirection = /eq\(['"]direction['"],\s*['"]outbound['"]\)/.test(routeSource)
  assert(!hasWrongDirection, "Must not filter direction === 'outbound' (missing -api suffix)")
})

test('Inbound direction uses inbound value', () => {
  assert(routeSource.includes("'inbound'"), "Expected direction 'inbound' for reply detection")
})

// ── Column name check ────────────────────────────────────────────────────────
test('Inbound select uses message_body column (not body)', () => {
  // Check for select('lead_id, message_body') — the correct column
  assert(
    routeSource.includes('message_body'),
    "Expected 'message_body' column in select — not 'body'"
  )
})

test('Inbound select does NOT use standalone body column', () => {
  // The old bug used .select('lead_id, body') — check it is gone
  const hasBodyColumn = /select\(['"][^'"]*(?<![_a-z])body(?![_a-z])[^'"]*['"]\)/.test(routeSource)
  assert(!hasBodyColumn, "Route must not select plain 'body' column — use message_body")
})

// ── Auth via session (not query param) ─────────────────────────────────────────
test('Route imports and calls validateSession for auth', () => {
  assert(routeSource.includes('validateSession'), 'Route must import and call validateSession')
})

test('Route reads session from cookie (not agent_id query param)', () => {
  assert(
    routeSource.includes('leadflow_session'),
    "Route must read auth from 'leadflow_session' cookie"
  )
})

test('Session validation occurs before any DB query in GET handler', () => {
  // Within the GET function body, validateSession call comes before .from(
  const getHandlerBody = routeSource.slice(routeSource.indexOf('export async function GET'))
  const validateIdx = getHandlerBody.indexOf('validateSession(')
  const fromIdx = getHandlerBody.indexOf('.from(')
  assert(validateIdx > -1, 'validateSession must be called in GET handler')
  assert(validateIdx < fromIdx, 'validateSession must be called before any supabaseAdmin.from()')
})

// ── Agent scoping ─────────────────────────────────────────────────────────────
test('Scopes queries to agent_id from session', () => {
  assert(
    routeSource.includes("eq('agent_id', agentId)"),
    "Expected .eq('agent_id', agentId) for tenant isolation"
  )
})

// ── Response shape ────────────────────────────────────────────────────────────
test('Response includes deliveryRate field', () => {
  assert(routeSource.includes('deliveryRate'), 'Response must include deliveryRate')
})

test('Response includes replyRate field', () => {
  assert(routeSource.includes('replyRate'), 'Response must include replyRate')
})

test('Response includes bookingConversion field', () => {
  assert(routeSource.includes('bookingConversion'), 'Response must include bookingConversion')
})

// ── Opt-out keyword handling ─────────────────────────────────────────────────
test('OPT_OUT_KEYWORDS constant is defined', () => {
  assert(routeSource.includes('OPT_OUT_KEYWORDS'), 'Must define OPT_OUT_KEYWORDS array')
})

test('STOP keyword is in opt-out list', () => {
  assert(routeSource.includes("'STOP'"), 'Must handle STOP opt-out keyword')
})

// ── Cache headers ─────────────────────────────────────────────────────────────
test('Response includes Cache-Control header', () => {
  assert(routeSource.includes('Cache-Control'), 'Endpoint must set Cache-Control header')
})

// ── Jest test file present ────────────────────────────────────────────────────
test('Jest unit test file exists for sms-stats', () => {
  const testPath = path.join(
    __dirname,
    '../product/lead-response/dashboard/tests/sms-stats.test.ts'
  )
  assert(fs.existsSync(testPath), 'tests/sms-stats.test.ts must exist')
})

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
} else {
  console.log('✅ All checks passed — sms-stats route correctly targets sms_messages table\n')
}
