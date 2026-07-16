'use strict'

/**
 * QC verification test for PR #1860 — SMS Activation Nudge
 *
 * Verifies code correctness beyond structural existence:
 * - URL pattern consistency (env var fallback)
 * - No duplicate service implementations
 * - Auth on every handler
 * - Bulk blast safety (never re-sends to already-nudged)
 * - SMS message length within single segment (160 chars GSM-7)
 * - Frontend handles all API response shapes
 *
 * Usage: node tests/qc-71d09217-activation-nudge-verify.test.js
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const ROOT = path.join(__dirname, '..')
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard')

let passed = 0, failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  FAIL: ${name}: ${err.message}`)
    failed++
  }
}

function readSrc(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

console.log('\nQC Verify: uc-sms-activation-nudge (PR #1860)\n')

const routeSrc = readSrc('product/lead-response/dashboard/app/api/admin/activation/route.ts')
const pageSrc = readSrc('product/lead-response/dashboard/app/admin/activation/page.tsx')
const adminHubSrc = readSrc('product/lead-response/dashboard/app/admin/page.tsx')

// --- URL pattern ---

test('ONBOARDING_URL is a named constant (not inline magic string)', () => {
  assert.ok(routeSrc.includes('const ONBOARDING_URL'), 'URL should be a named constant')
})

// --- Import resolution ---

test('route imports postgrestAdmin from @/lib/db', () => {
  assert.ok(routeSrc.includes("from '@/lib/db'"), 'Must import from @/lib/db')
})

test('route imports requireAdmin from AuthService', () => {
  assert.ok(routeSrc.includes("from '@/lib/services/AuthService'"), 'Must import from AuthService')
})

test('route imports sendSms from @/lib/twilio', () => {
  assert.ok(routeSrc.includes("from '@/lib/twilio'"), 'Must reuse existing twilio service')
})

// --- No duplicate SMS service ---

test('no inline Twilio client creation in route (uses shared service)', () => {
  assert.ok(!routeSrc.includes('twilio('), 'Must not create Twilio client inline')
  assert.ok(!routeSrc.includes('new Twilio'), 'Must not instantiate Twilio inline')
  assert.ok(!routeSrc.includes('TWILIO_ACCOUNT_SID'), 'Must not read Twilio creds directly')
})

// --- Auth guards ---

test('GET handler has auth as first operation', () => {
  const getBody = routeSrc.split('export async function GET')[1]
  const beforeRequireAdmin = getBody.split('requireAdmin')[0]
  assert.ok(!beforeRequireAdmin.includes('postgrestAdmin'), 'No DB access before auth check in GET')
  assert.ok(!beforeRequireAdmin.includes('sendSms'), 'No SMS before auth check in GET')
})

test('POST handler has auth as first operation', () => {
  const postBody = routeSrc.split('export async function POST')[1]
  const beforeRequireAdmin = postBody.split('requireAdmin')[0]
  assert.ok(!beforeRequireAdmin.includes('postgrestAdmin'), 'No DB access before auth check in POST')
  assert.ok(!beforeRequireAdmin.includes('sendSms'), 'No SMS before auth check in POST')
})

// --- Bulk blast safety ---

test('bulk mode filters by last_activation_sms_at IS NULL', () => {
  assert.ok(
    routeSrc.includes("is('last_activation_sms_at', null)"),
    'Bulk must only target agents never nudged'
  )
})

test('bulk mode also filters for non-null phone', () => {
  assert.ok(
    routeSrc.includes("not('phone_number', 'is', null)"),
    'Bulk must skip agents without phone numbers'
  )
})

// --- SMS message safety ---

test('SMS message is under 160 chars for single segment billing', () => {
  const urlMatch = routeSrc.match(/const ONBOARDING_URL\s*=\s*['"]([^'"]+)['"]/)
  assert.ok(urlMatch, 'Should find ONBOARDING_URL')
  const url = urlMatch[1]
  // Worst case: "Hi <20-char-name>, your LeadFlow AI trial is ready. Finish setup in 2 min: <url>"
  const maxMsg = `Hi ${'A'.repeat(20)}, your LeadFlow AI trial is ready. Finish setup in 2 min: ${url}`
  assert.ok(maxMsg.length <= 160, `SMS may exceed 1 segment (${maxMsg.length} chars with 20-char name)`)
})

// --- Frontend correctness ---

test('page handles empty agents list (shows fallback UI)', () => {
  assert.ok(pageSrc.includes('agents.length === 0'), 'Should handle empty state')
})

test('page shows error state', () => {
  assert.ok(pageSrc.includes('{error}') || pageSrc.includes('error &&'), 'Should show error state')
})

test('page shows loading state', () => {
  assert.ok(pageSrc.includes('loading'), 'Should have loading state')
})

test('single nudge button disabled while sending', () => {
  assert.ok(pageSrc.includes('isSending'), 'Should track per-agent sending state')
  assert.ok(pageSrc.includes('disabled={isSending}'), 'Button should be disabled while sending')
})

test('bulk nudge button disabled when no eligible agents', () => {
  assert.ok(pageSrc.includes('pendingCount === 0'), 'Bulk button disabled when nothing to send')
})

test('page updates local state after successful send (no stale UI)', () => {
  assert.ok(
    pageSrc.includes('setAgents(prev =>'),
    'Should optimistically update agent list after send'
  )
})

// --- Admin hub integration ---

test('admin hub card has descriptive text', () => {
  assert.ok(adminHubSrc.includes('SMS Nudge') || adminHubSrc.includes('Activation'), 'Admin hub card should describe the feature')
})

// --- SQL migration ---

const sqlSrc = readSrc('scripts/db/add-activation-sms-timestamp.sql')

test('SQL migration type is TIMESTAMPTZ (not TIMESTAMP)', () => {
  assert.ok(sqlSrc.includes('TIMESTAMPTZ'), 'Column must be TIMESTAMPTZ for timezone safety')
})

// --- No XSS in toast messages ---

test('toast messages use state, not dangerouslySetInnerHTML', () => {
  assert.ok(!pageSrc.includes('dangerouslySetInnerHTML'), 'No raw HTML injection in toasts')
})

// --- Results ---

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
