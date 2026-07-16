'use strict'

/**
 * Regression test: Stripe checkout env var name correctness
 * Task: 69b2fedf-0c48-4aab-a0f3-7a5db3670fe6
 *
 * Root cause: upgrade-checkout and create-checkout-session used wrong env var
 * names (STRIPE_PRICE_PROFESSIONAL_MONTHLY, STRIPE_PRICE_ENTERPRISE_MONTHLY)
 * instead of the names actually set in Vercel production
 * (STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_TEAM_MONTHLY).
 *
 * The invalid fallback strings ('price_professional_monthly', etc.) passed the
 * truthy guard but caused Stripe to return StripeInvalidRequestError, silently
 * blocking every pro/team checkout attempt.
 *
 * This test reads the two affected source files and asserts the correct env var
 * names are used — preventing any future regression to the wrong names.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(
  '/Users/clawdbot/projects/leadflow',
  'product/lead-response/dashboard'
)

const UPGRADE_CHECKOUT = path.join(
  DASHBOARD_DIR,
  'app/api/stripe/upgrade-checkout/route.ts'
)

const CREATE_CHECKOUT_SESSION = path.join(
  DASHBOARD_DIR,
  'app/api/billing/create-checkout-session/route.ts'
)

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

// ── upgrade-checkout/route.ts ─────────────────────────────────────────────
console.log('\n[1] upgrade-checkout/route.ts — env var names')

const upgradeCheckout = fs.readFileSync(UPGRADE_CHECKOUT, 'utf8')

test('pro plan uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
  assert.ok(
    upgradeCheckout.includes('STRIPE_PRICE_PRO_MONTHLY'),
    'STRIPE_PRICE_PRO_MONTHLY not found in upgrade-checkout'
  )
  assert.ok(
    !upgradeCheckout.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Stale STRIPE_PRICE_PROFESSIONAL_MONTHLY found — wrong env var name'
  )
})

test('team plan uses STRIPE_PRICE_TEAM_MONTHLY (not ENTERPRISE)', () => {
  assert.ok(
    upgradeCheckout.includes('STRIPE_PRICE_TEAM_MONTHLY'),
    'STRIPE_PRICE_TEAM_MONTHLY not found in upgrade-checkout'
  )
  assert.ok(
    !upgradeCheckout.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
    'Stale STRIPE_PRICE_ENTERPRISE_MONTHLY found — wrong env var name'
  )
})

test('no invalid fallback price ID strings that Stripe would reject', () => {
  assert.ok(
    !upgradeCheckout.includes("'price_professional_monthly'"),
    "Invalid fallback 'price_professional_monthly' present"
  )
  assert.ok(
    !upgradeCheckout.includes("'price_enterprise_monthly'"),
    "Invalid fallback 'price_enterprise_monthly' present"
  )
  assert.ok(
    !upgradeCheckout.includes("'price_starter_monthly'"),
    "Invalid fallback 'price_starter_monthly' present"
  )
})

test('price ID validation guard returns 503 when price not configured', () => {
  assert.ok(
    upgradeCheckout.includes('PRICE_NOT_CONFIGURED'),
    'Missing PRICE_NOT_CONFIGURED error code for unconfigured price IDs'
  )
  assert.ok(
    upgradeCheckout.includes('status: 503') || upgradeCheckout.includes('{ status: 503 }'),
    'Missing 503 response for unconfigured price IDs'
  )
})

// ── create-checkout-session/route.ts ──────────────────────────────────────
console.log('\n[2] create-checkout-session/route.ts — env var names')

const createCheckoutSession = fs.readFileSync(CREATE_CHECKOUT_SESSION, 'utf8')

test('pro plan uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
  assert.ok(
    createCheckoutSession.includes('STRIPE_PRICE_PRO_MONTHLY'),
    'STRIPE_PRICE_PRO_MONTHLY not found in create-checkout-session'
  )
  assert.ok(
    !createCheckoutSession.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Stale STRIPE_PRICE_PROFESSIONAL_MONTHLY found — wrong env var name'
  )
})

// ── Cross-check: create-checkout/route.ts already correct ─────────────────
console.log('\n[3] create-checkout/route.ts — confirm already correct')

const CREATE_CHECKOUT = path.join(
  DASHBOARD_DIR,
  'app/api/billing/create-checkout/route.ts'
)
const createCheckout = fs.readFileSync(CREATE_CHECKOUT, 'utf8')

test('create-checkout uses STRIPE_PRICE_PRO_MONTHLY', () => {
  assert.ok(
    createCheckout.includes('STRIPE_PRICE_PRO_MONTHLY'),
    'create-checkout missing STRIPE_PRICE_PRO_MONTHLY'
  )
})

test('create-checkout uses STRIPE_PRICE_TEAM_MONTHLY', () => {
  assert.ok(
    createCheckout.includes('STRIPE_PRICE_TEAM_MONTHLY'),
    'create-checkout missing STRIPE_PRICE_TEAM_MONTHLY'
  )
})

test('no STRIPE_PRICE_PROFESSIONAL_MONTHLY in create-checkout', () => {
  assert.ok(
    !createCheckout.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Stale STRIPE_PRICE_PROFESSIONAL_MONTHLY in create-checkout'
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
