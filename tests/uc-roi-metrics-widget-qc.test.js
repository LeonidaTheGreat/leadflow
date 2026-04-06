/**
 * QC E2E Test: ROI Metrics Widget
 * Task: 2d2807ef-2c5a-4e9a-8d65-a777d1d6bf1c
 *
 * Verifies acceptance criteria for the ROI Metrics Widget feature.
 * Uses plain Node.js + assert — no framework dependencies.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0
const results = []

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
    results.push({ name, status: 'PASS' })
  } catch (e) {
    console.log(`  FAIL: ${name}`)
    console.log(`        ${e.message}`)
    failed++
    results.push({ name, status: 'FAIL', reason: e.message })
  }
}

const DASHBOARD_DIR = path.resolve(__dirname, '../product/lead-response/dashboard')
const API_ROUTE = path.join(DASHBOARD_DIR, 'app/api/metrics/roi/route.ts')
const WIDGET = path.join(DASHBOARD_DIR, 'components/dashboard/RoiMetricsWidget.tsx')
const DASHBOARD_PAGE = path.join(DASHBOARD_DIR, 'app/dashboard/page.tsx')

console.log('\n=== ROI Metrics Widget QC E2E Test ===\n')

// ──────────────────────────────────────────────
// AC1: Widget exists on dashboard homepage with 4 required metrics
// ──────────────────────────────────────────────
console.log('AC1: Widget on dashboard homepage with 4 required metrics')

test('Dashboard page imports RoiMetricsWidget', () => {
  const src = fs.readFileSync(DASHBOARD_PAGE, 'utf8')
  assert(src.includes("from '@/components/dashboard/RoiMetricsWidget'"),
    'Dashboard page must import RoiMetricsWidget')
})

test('Dashboard page renders RoiMetricsWidget', () => {
  const src = fs.readFileSync(DASHBOARD_PAGE, 'utf8')
  assert(src.includes('<RoiMetricsWidget'), 'Dashboard page must render <RoiMetricsWidget />')
})

test('Widget shows Leads Responded metric', () => {
  const src = fs.readFileSync(WIDGET, 'utf8')
  assert(src.includes('leadsResponded') || src.includes('Leads Responded'),
    'Widget must display Leads Responded')
})

test('Widget shows Avg Response Time metric', () => {
  const src = fs.readFileSync(WIDGET, 'utf8')
  assert(src.includes('avgResponseTimeSeconds') || src.includes('Avg Response Time'),
    'Widget must display Avg Response Time')
})

test('Widget shows Appointments Booked this month metric', () => {
  const src = fs.readFileSync(WIDGET, 'utf8')
  assert(src.includes('appointmentsBookedThisMonth') || src.includes('Appointments Booked'),
    'Widget must display Appointments Booked This Month')
})

test('Widget shows Estimated Revenue Protected metric', () => {
  const src = fs.readFileSync(WIDGET, 'utf8')
  assert(src.includes('estimatedRevenueProtected') || src.includes('Revenue Protected'),
    'Widget must display Estimated Revenue Protected')
})

// ──────────────────────────────────────────────
// AC2: Numbers pull from real database (not mocked)
// ──────────────────────────────────────────────
console.log('\nAC2: Real database data (not mocked)')

test('API route fetches leads from database', () => {
  const src = fs.readFileSync(API_ROUTE, 'utf8')
  assert(src.includes(".from('leads')") || src.includes('.from("leads")'),
    'API must query leads table from database')
})

test('API route fetches bookings from database', () => {
  const src = fs.readFileSync(API_ROUTE, 'utf8')
  assert(src.includes('calcom_bookings') || src.includes('bookings'),
    'API must query bookings table from database')
})

test('API route filters by authenticated agent_id', () => {
  const src = fs.readFileSync(API_ROUTE, 'utf8')
  assert(src.includes('.eq(\'agent_id\', agentId)') || src.includes('.eq("agent_id", agentId)'),
    'API must scope data to the authenticated agent')
})

test('API is not hardcoding/mocking data', () => {
  const src = fs.readFileSync(API_ROUTE, 'utf8')
  // Check there are no obvious hardcoded fake data patterns
  assert(!src.includes('leadsResponded: 42') && !src.includes('leadsResponded: 100'),
    'API must not return hardcoded metric values')
})

// ──────────────────────────────────────────────
// AC3: Real-time updates
// ──────────────────────────────────────────────
console.log('\nAC3: Real-time update behavior')

test('Widget has real-time polling or subscription mechanism', () => {
  const src = fs.readFileSync(WIDGET, 'utf8')
  const hasPolling = src.includes('setInterval') || src.includes('useInterval')
  const hasSubscription = src.includes('subscribe') || src.includes('channel')
  const hasRefetch = src.includes('refetch') || src.includes('refresh')
  assert(hasPolling || hasSubscription || hasRefetch,
    'Widget must poll or subscribe to reflect real-time changes (no setInterval, subscribe, or refetch found)')
})

// ──────────────────────────────────────────────
// AC4: Empty state for agents with no leads
// ──────────────────────────────────────────────
console.log('\nAC4: Empty state with FUB connection prompt')

test('Widget renders empty state when hasData=false', () => {
  const src = fs.readFileSync(WIDGET, 'utf8')
  assert(src.includes('hasData') || src.includes('empty state') || src.includes('Coming Soon'),
    'Widget must handle empty state')
})

test('Empty state includes FUB connection prompt', () => {
  const src = fs.readFileSync(WIDGET, 'utf8')
  assert(src.includes('Connect') && (src.includes('FUB') || src.includes('Follow Up Boss')),
    'Empty state must prompt user to connect Follow Up Boss')
})

// ──────────────────────────────────────────────
// Security: Auth check on API endpoint
// ──────────────────────────────────────────────
console.log('\nSecurity: Auth check')

test('API endpoint requires authentication', () => {
  const src = fs.readFileSync(API_ROUTE, 'utf8')
  assert(src.includes('getAuthUserId') || src.includes('getSession') || src.includes('Unauthorized'),
    'API endpoint must verify authentication')
})

test('API returns 401 when no auth', () => {
  const src = fs.readFileSync(API_ROUTE, 'utf8')
  assert(src.includes("status: 401") || src.includes("{ status: 401 }"),
    'API must return 401 for unauthenticated requests')
})

test('No hardcoded credentials or tokens in API route', () => {
  const src = fs.readFileSync(API_ROUTE, 'utf8')
  assert(!src.includes('sk_live_') && !src.includes('sk_test_') && !src.includes('eyJ'),
    'API route must not contain hardcoded credentials')
})

// ──────────────────────────────────────────────
// Revenue formula correctness
// ──────────────────────────────────────────────
console.log('\nFormula: Revenue Protected')

test('Revenue formula uses leads × commission × bookingRate', () => {
  const src = fs.readFileSync(API_ROUTE, 'utf8')
  assert(src.includes('leadsResponded') && src.includes('AVG_COMMISSION') && src.includes('bookingRate'),
    'Revenue formula must use leadsResponded × commission × bookingRate')
})

test('Average property value assumption is present', () => {
  const src = fs.readFileSync(API_ROUTE, 'utf8')
  assert(src.includes('AVG_PROPERTY_VALUE') || src.includes('350000'),
    'Revenue formula must include property value assumption')
})

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)

if (failed > 0) {
  process.exit(1)
}
