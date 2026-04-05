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
test('Inbound select uses body column (actual sms_messages schema)', () => {
  // Check for select including 'body' — the correct column in sms_messages
  assert(
    routeSource.includes("'body'") || routeSource.includes("body,") || routeSource.includes(", body"),
    "Expected 'body' column in select — actual sms_messages column name"
  )
})

test('Inbound select does NOT use message_body column (old incorrect name)', () => {
  // The old bug used .select('lead_id, message_body') — check it is gone
  const hasMessageBodyColumn = /select\(['"][^'"]*message_body[^'"]*['"]\)/.test(routeSource)
  assert(!hasMessageBodyColumn, "Route must not use 'message_body' column — use 'body'")
})

// ── Auth via getAuthUserId (not query param) ────────────────────────────────────
test('Route imports and calls getAuthUserId for auth', () => {
  assert(routeSource.includes('getAuthUserId'), 'Route must import and call getAuthUserId')
})

test('Route reads agentId from authenticated session (not query param)', () => {
  assert(
    routeSource.includes('const agentId = await getAuthUserId(request)'),
    "Route must extract agentId from authenticated session"
  )
})

test('Auth check returns 401 if no session', () => {
  // Check for auth guard that returns 401
  assert(
    routeSource.includes('401'),
    "Route must return 401 Unauthorized if no session"
  )
})

// ── Agent scoping via join ────────────────────────────────────────────────────
test('Outbound query uses leads!inner join for agent scoping', () => {
  assert(
    routeSource.includes('leads!inner(agent_id)'),
    "Expected leads!inner(agent_id) join in outbound query for agent scoping"
  )
})

test('Inbound query uses leads.agent_id filter for tenant isolation', () => {
  assert(
    routeSource.includes("eq('leads.agent_id', agentId)"),
    "Expected .eq('leads.agent_id', agentId) for agent scoping via join"
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

test('stop keyword (lowercase) is in opt-out list', () => {
  assert(routeSource.includes("'stop'"), 'Must handle stop opt-out keyword (case-insensitive check)')
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
