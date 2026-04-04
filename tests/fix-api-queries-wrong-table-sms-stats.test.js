#!/usr/bin/env node
/**
 * E2E Test: sms-stats endpoint queries sms_messages correctly
 *
 * Bug fixes verified:
 * 1. /api/analytics/sms-stats uses sms_messages table (not plain messages)
 * 2. sms_messages has no agent_id — filter via leads!inner(agent_id) join
 * 3. Body column is 'body' (not 'message_body')
 *
 * Test ID: fix-api-queries-wrong-table-sms-stats-endpoint-returns
 * Task:    42327d6d-b98c-48b9-9f5f-579638f2b5b3
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

// ── Agent scoping via leads join (agent_id not on sms_messages) ──────────────
test('Route does NOT filter sms_messages directly by agent_id column', () => {
  // sms_messages has no agent_id column — direct eq would cause HTTP 400
  const hasDirect = /\.eq\(['"]agent_id['"],\s*agentId\)/.test(routeSource)
  assert(!hasDirect, "Route must not use .eq('agent_id', agentId) on sms_messages — column does not exist")
})

test('Route joins sms_messages through leads to filter by agent', () => {
  // Must use leads!inner(agent_id) join for agent scoping
  assert(
    routeSource.includes("leads!inner(agent_id)"),
    "Expected leads!inner(agent_id) join to filter sms_messages by agent"
  )
})

test('Route filters by leads.agent_id (not sms_messages.agent_id)', () => {
  assert(
    routeSource.includes("eq('leads.agent_id', agentId)"),
    "Expected .eq('leads.agent_id', agentId) for tenant isolation via join"
  )
})

// ── Column name check ────────────────────────────────────────────────────────
test('Inbound select uses body column (actual sms_messages column name)', () => {
  // sms_messages schema: id, lead_id, direction, body, twilio_sid, status, created_at
  assert(
    routeSource.includes("'body'") || routeSource.includes(', body,') || routeSource.includes(', body)') || routeSource.includes("'lead_id, body"),
    "Expected 'body' column in select — that is the actual sms_messages column name"
  )
})

test('Opt-out detection uses body field (not message_body)', () => {
  assert(
    routeSource.includes('m.body') || routeSource.includes('isOptOut(m.body)'),
    "Opt-out detection must use m.body (actual column name)"
  )
})

// ── Auth via getAuthUserId (checks both session types) ────────────────────────
test('Route imports getAuthUserId for auth', () => {
  assert(routeSource.includes('getAuthUserId'), 'Route must import and call getAuthUserId')
})

test('Auth check occurs before any DB query in GET handler', () => {
  const getHandlerBody = routeSource.slice(routeSource.indexOf('export async function GET'))
  const authIdx = getHandlerBody.indexOf('getAuthUserId(')
  const fromIdx = getHandlerBody.indexOf('.from(')
  assert(authIdx > -1, 'getAuthUserId must be called in GET handler')
  assert(authIdx < fromIdx, 'getAuthUserId must be called before any supabaseAdmin.from()')
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

test('stop keyword is in opt-out list (case-insensitive)', () => {
  assert(
    routeSource.includes("'stop'") || routeSource.includes('"stop"'),
    "Must handle 'stop' opt-out keyword"
  )
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
  console.log('✅ All checks passed — sms-stats route correctly uses leads join for agent scoping\n')
}
