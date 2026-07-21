'use strict'

/**
 * Regression test: Stripe env var correctness — remaining files
 * Task: 44a8a1d6-d03d-44e0-bc24-050057404e84
 *
 * Root cause: After the previous fix (69b2fedf), two dashboard routes and the
 * backend config/service still referenced stale Stripe env var names:
 *   - STRIPE_PRICE_PROFESSIONAL_MONTHLY  → should be STRIPE_PRICE_PRO_MONTHLY
 *   - STRIPE_PRICE_ENTERPRISE_MONTHLY    → should be STRIPE_PRICE_TEAM_MONTHLY
 *   - STRIPE_PRICE_STARTER_YEARLY        → should be STRIPE_PRICE_STARTER_ANNUAL
 *
 * The trial/nudge bug was especially severe: the invalid fallback string
 * 'price_professional_monthly' caused the inverted guard to SKIP checkout
 * creation entirely — trial users always received a /pricing redirect instead
 * of a direct Stripe checkout URL.
 *
 * This test reads the four affected source files and asserts the correct env
 * var names are present, preventing regression to the wrong names.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = path.join(__dirname, '../..')
const DASHBOARD_DIR = path.join(PROJECT_ROOT, 'product/lead-response/dashboard')

const FILES = {
  trialNudge: path.join(DASHBOARD_DIR, 'app/api/trial/nudge/route.ts'),
  paymentLink: path.join(DASHBOARD_DIR, 'app/api/admin/sales-cockpit/payment-link/route.ts'),
  libConfig: path.join(PROJECT_ROOT, 'lib/config/index.js'),
  billingService: path.join(PROJECT_ROOT, 'lib/services/BillingService.js'),
}

let passed = 0
let failed = 0

function test(label, fn) {
  try {
    fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (e) {
    console.error(`  ❌ ${label}`)
    console.error(`     ${e.message}`)
    failed++
  }
}

// ── trial/nudge/route.ts ──────────────────────────────────────────────────
console.log('\n[1] trial/nudge/route.ts — Pro price ID env var')

const trialNudge = fs.readFileSync(FILES.trialNudge, 'utf8')

test('uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL_MONTHLY)', () => {
  assert.ok(
    trialNudge.includes('STRIPE_PRICE_PRO_MONTHLY'),
    'STRIPE_PRICE_PRO_MONTHLY not found in trial/nudge'
  )
  assert.ok(
    !trialNudge.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Stale STRIPE_PRICE_PROFESSIONAL_MONTHLY still present in trial/nudge'
  )
})

test('no invalid fallback price ID string that Stripe would reject', () => {
  assert.ok(
    !trialNudge.includes("'price_professional_monthly'"),
    "Invalid fallback 'price_professional_monthly' still present"
  )
})

test('guard uses regex validation instead of inverted startsWith', () => {
  assert.ok(
    !trialNudge.includes("!PRO_PRICE_ID.startsWith('price_professional')"),
    'Inverted guard !startsWith still present — checkout would be incorrectly skipped'
  )
})

// ── admin/sales-cockpit/payment-link/route.ts ──────────────────────────────
console.log('\n[2] admin/sales-cockpit/payment-link/route.ts — Pro price ID env var')

const paymentLink = fs.readFileSync(FILES.paymentLink, 'utf8')

test('uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL_MONTHLY)', () => {
  assert.ok(
    paymentLink.includes('STRIPE_PRICE_PRO_MONTHLY'),
    'STRIPE_PRICE_PRO_MONTHLY not found in payment-link route'
  )
  assert.ok(
    !paymentLink.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Stale STRIPE_PRICE_PROFESSIONAL_MONTHLY still in payment-link route'
  )
})

// ── lib/config/index.js ────────────────────────────────────────────────────
console.log('\n[3] lib/config/index.js — price ID env var names')

const libConfig = fs.readFileSync(FILES.libConfig, 'utf8')

test('pro tier reads STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL_MONTHLY)', () => {
  assert.ok(
    libConfig.includes('STRIPE_PRICE_PRO_MONTHLY'),
    'STRIPE_PRICE_PRO_MONTHLY not found in lib/config'
  )
  assert.ok(
    !libConfig.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Stale STRIPE_PRICE_PROFESSIONAL_MONTHLY in lib/config'
  )
})

test('team tier reads STRIPE_PRICE_TEAM_MONTHLY (not ENTERPRISE_MONTHLY)', () => {
  assert.ok(
    libConfig.includes('STRIPE_PRICE_TEAM_MONTHLY'),
    'STRIPE_PRICE_TEAM_MONTHLY not found in lib/config'
  )
  assert.ok(
    !libConfig.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
    'Stale STRIPE_PRICE_ENTERPRISE_MONTHLY in lib/config'
  )
})

test('annual prices use _ANNUAL suffix (not _YEARLY)', () => {
  assert.ok(
    libConfig.includes('STRIPE_PRICE_STARTER_ANNUAL'),
    'STRIPE_PRICE_STARTER_ANNUAL not found in lib/config'
  )
  assert.ok(
    !libConfig.includes('STRIPE_PRICE_STARTER_YEARLY'),
    'Stale STRIPE_PRICE_STARTER_YEARLY in lib/config'
  )
  assert.ok(
    !libConfig.includes('STRIPE_PRICE_PROFESSIONAL_YEARLY'),
    'Stale STRIPE_PRICE_PROFESSIONAL_YEARLY in lib/config'
  )
  assert.ok(
    !libConfig.includes('STRIPE_PRICE_ENTERPRISE_YEARLY'),
    'Stale STRIPE_PRICE_ENTERPRISE_YEARLY in lib/config'
  )
})

// ── lib/services/BillingService.js ────────────────────────────────────────
console.log('\n[4] lib/services/BillingService.js — diagnostic env var names')

const billingService = fs.readFileSync(FILES.billingService, 'utf8')

test('diagnostic check references STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
  assert.ok(
    billingService.includes('STRIPE_PRICE_PRO_MONTHLY'),
    'STRIPE_PRICE_PRO_MONTHLY not found in BillingService diagnostic'
  )
  assert.ok(
    !billingService.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Stale STRIPE_PRICE_PROFESSIONAL_MONTHLY in BillingService diagnostic'
  )
})

test('diagnostic check references STRIPE_PRICE_TEAM_MONTHLY (not ENTERPRISE)', () => {
  assert.ok(
    billingService.includes('STRIPE_PRICE_TEAM_MONTHLY'),
    'STRIPE_PRICE_TEAM_MONTHLY not found in BillingService diagnostic'
  )
  assert.ok(
    !billingService.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
    'Stale STRIPE_PRICE_ENTERPRISE_MONTHLY in BillingService diagnostic'
  )
})

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('\n❌ Tests FAILED')
  process.exit(1)
} else {
  console.log('\n✅ All tests passed')
}
