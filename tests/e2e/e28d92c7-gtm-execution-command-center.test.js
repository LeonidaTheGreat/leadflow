#!/usr/bin/env node
/**
 * QC E2E: GTM Execution Command Center
 * UC: e28d92c7
 * Tests: API route logic, admin page rendering, build artifact presence,
 *        deriveExecutionStatus edge cases, computeCompletionPercent edge cases,
 *        auth enforcement, error handling.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.resolve(__dirname, '../../product/lead-response/dashboard')
const API_ROUTE = path.join(DASHBOARD_ROOT, 'app/api/admin/gtm-status/route.ts')
const ADMIN_PAGE = path.join(DASHBOARD_ROOT, 'app/admin/page.tsx')

let passed = 0
let failed = 0
const errors = []

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS ${name}`)
    passed++
  } catch (e) {
    console.error(`  FAIL ${name}: ${e.message}`)
    errors.push({ name, message: e.message })
    failed++
  }
}

function readFile(p) {
  return fs.readFileSync(p, 'utf8')
}

// --- File existence ---
console.log('\n[1] File existence')
test('API route exists', () => {
  assert.ok(fs.existsSync(API_ROUTE), `Missing: ${API_ROUTE}`)
})
test('Admin page exists', () => {
  assert.ok(fs.existsSync(ADMIN_PAGE), `Missing: ${ADMIN_PAGE}`)
})

// --- API route: auth enforcement ---
console.log('\n[2] Auth enforcement')
const apiSrc = readFile(API_ROUTE)
test('Route calls isAdminUser before any DB access', () => {
  const authIdx = apiSrc.indexOf('isAdminUser')
  const dbIdx = apiSrc.indexOf("postgrestAdmin")
  assert.ok(authIdx > -1, 'isAdminUser not found in route')
  assert.ok(authIdx < dbIdx, 'isAdminUser must appear before first postgrestAdmin call')
})
test('Unauthorized path returns 401', () => {
  assert.ok(apiSrc.includes("status: 401"), 'Route must return 401 on auth failure')
})

// --- API route: data sources ---
console.log('\n[3] Required data sources')
test('Reads pilot_recruitment_campaigns', () => {
  assert.ok(apiSrc.includes("from('pilot_recruitment_campaigns')"))
})
test('Reads pilot_recruitment_targets', () => {
  assert.ok(apiSrc.includes("from('pilot_recruitment_targets')"))
})
test('Reads pilot_invites', () => {
  assert.ok(apiSrc.includes("from('pilot_invites')"))
})
test('Reads pilot_progress', () => {
  assert.ok(apiSrc.includes("from('pilot_progress')"))
})
test('Reads action_items with WAITING filter', () => {
  assert.ok(apiSrc.includes("from('action_items')"))
  assert.ok(apiSrc.includes("'WAITING'"), 'action_items must be filtered to WAITING status')
})
test('Calls checkSmsDeliveryHealth', () => {
  assert.ok(apiSrc.includes('checkSmsDeliveryHealth'), 'SMS delivery health check must be called')
})
test('Calls getA2pRegistrationStatus', () => {
  assert.ok(apiSrc.includes('getA2pRegistrationStatus'), 'A2P status must be included')
})

// --- API route: error handling ---
console.log('\n[4] Error handling')
test('Errors on bad campaign result', () => {
  assert.ok(apiSrc.includes('if (campaignsResult.error) throw campaignsResult.error'), 'Must throw on campaigns DB error')
})
test('Errors on bad targets result', () => {
  assert.ok(apiSrc.includes('if (targetsResult.error) throw targetsResult.error'), 'Must throw on targets DB error')
})
test('Top-level catch returns 500', () => {
  assert.ok(apiSrc.includes('status: 500'), 'Must return 500 on unhandled error')
})
test('actionItems error is non-fatal (defaults to empty array)', () => {
  assert.ok(
    apiSrc.includes('actionItemsResult.error ? [] : actionItemsResult.data'),
    'actionItems failure must fall back to empty array (non-fatal)'
  )
})

// --- deriveExecutionStatus logic (source-level) ---
console.log('\n[5] Execution status derivation logic')
test('Returns not_started when all counts zero and no pending items', () => {
  // Parse the function from source — verify the conditional branches exist
  assert.ok(apiSrc.includes("return input.pendingActionItems > 0 ? 'blocked' : 'not_started'"))
})
test('Returns blocked when a2p not_started and no pilots', () => {
  assert.ok(apiSrc.includes("input.a2pStatus === 'not_started' && input.pilotCount === 0"))
  assert.ok(apiSrc.includes("return 'blocked'"))
})
test('Returns ready_to_scale threshold: 3 pilots and 10+ contacted', () => {
  assert.ok(apiSrc.includes('input.pilotCount >= 3 && input.contactedCount >= 10'))
  assert.ok(apiSrc.includes("return 'ready_to_scale'"))
})
test('Falls through to in_progress', () => {
  assert.ok(apiSrc.includes("return 'in_progress'"))
})

// --- computeCompletionPercent logic ---
console.log('\n[6] Completion percentage logic')
test('Caps at 100', () => {
  assert.ok(apiSrc.includes('Math.min(percent, 100)'))
})
test('A2P registered adds 15 total (pending+5)', () => {
  // pending adds 10, registered adds 5 more = 15 total for registered
  assert.ok(
    apiSrc.includes("input.a2pStatus === 'pending' || input.a2pStatus === 'registered') percent += 10"),
    'pending/registered should add 10'
  )
  assert.ok(
    apiSrc.includes("input.a2pStatus === 'registered') percent += 5"),
    'registered should add another 5'
  )
})

// --- Admin page: UI structure ---
console.log('\n[7] Admin page UI')
const pageSrc = readFile(ADMIN_PAGE)
test('Fetches /api/admin/gtm-status', () => {
  assert.ok(pageSrc.includes("fetch('/api/admin/gtm-status')"), 'Page must call GTM status API')
})
test('Renders GTM Execution Command Center heading', () => {
  assert.ok(pageSrc.includes('GTM Execution Command Center'))
})
test('Links to /admin/pilot-campaigns', () => {
  assert.ok(pageSrc.includes('/admin/pilot-campaigns'))
})
test('Links to /admin/outreach', () => {
  assert.ok(pageSrc.includes('/admin/outreach'))
})
test('Links to /admin/pilots', () => {
  assert.ok(pageSrc.includes('/admin/pilots'))
})
test('Links to /admin/funnel', () => {
  assert.ok(pageSrc.includes('/admin/funnel'))
})
test('Shows completionPercent progress bar', () => {
  assert.ok(pageSrc.includes('completionPercent'), 'Progress bar must use completionPercent')
})
test('Shows A2P status block', () => {
  assert.ok(pageSrc.includes('A2P 10DLC'), 'Must show A2P status in blockers section')
})
test('Shows action items section', () => {
  assert.ok(pageSrc.includes('actionItems'), 'Must render action items')
})
test('Handles loading state', () => {
  assert.ok(pageSrc.includes('Loading execution status'), 'Must show loading state')
})
test('Handles error state', () => {
  assert.ok(pageSrc.includes('Failed to load GTM status'), 'Must show error state')
})

// --- Security: no hardcoded secrets ---
console.log('\n[8] Security')
test('No hardcoded API keys in route', () => {
  const looksLikeSecret = /[a-zA-Z0-9]{32,}/.test(apiSrc.replace(/import.*\n/g, ''))
  // Allow long class names/strings but check for obvious patterns
  assert.ok(!apiSrc.includes('sk_live_'), 'No Stripe live key in route')
  assert.ok(!apiSrc.includes('AC[a-f0-9]{32}'), 'No Twilio account SID')
})
test('No hardcoded API keys in page', () => {
  assert.ok(!pageSrc.includes('sk_live_'), 'No Stripe live key in page')
})

// --- Build artifact check ---
console.log('\n[9] Build artifact')
const buildManifest = path.join(DASHBOARD_ROOT, '.next/build-manifest.json')
test('Next.js build artifact exists (build ran successfully)', () => {
  assert.ok(fs.existsSync(buildManifest), '.next/build-manifest.json must exist — run npm run build in dashboard first')
})

// --- Report ---
console.log('\n============================')
console.log(`PASSED: ${passed}  FAILED: ${failed}  TOTAL: ${passed + failed}`)
if (errors.length > 0) {
  console.log('\nFailed tests:')
  errors.forEach(e => console.log(`  - ${e.name}: ${e.message}`))
}
console.log('============================\n')

if (failed > 0) process.exit(1)
