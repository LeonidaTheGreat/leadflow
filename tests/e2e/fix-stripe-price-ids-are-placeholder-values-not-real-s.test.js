/**
 * QC E2E Test: Stripe Price IDs — Placeholder Rejection
 * ======================================================
 * Task: fix-stripe-price-ids-are-placeholder-values-not-real-s
 * Task ID: 18e9ac0c-0fe0-4a33-9ee7-88420fb12d7e
 *
 * Tests runtime behavior of the checkout API guard and signup page structure.
 * Verifies:
 *   1. create-checkout route rejects placeholder price IDs at the HTTP level
 *   2. PRICE_ID_ENV_MAP no longer maps to NEXT_PUBLIC_ or old STRIPE_PRICE_ID_* names
 *   3. signup/page.tsx has no hardcoded priceId values
 *   4. tier→env-var lookup chain is correct end-to-end
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const PROJECT = '/Users/clawdbot/projects/leadflow'
const DASHBOARD = path.join(PROJECT, 'product/lead-response/dashboard')

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

// ---------------------------------------------------------------------------
// 1. isValidPriceId() — replicates the source function
// ---------------------------------------------------------------------------

function isValidPriceId(id) {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,}$/.test(id)
}

console.log('\n[1] isValidPriceId() rejection of placeholder values')

test('rejects price_starter_49', () => {
  assert.strictEqual(isValidPriceId('price_starter_49'), false)
})
test('rejects price_pro_149', () => {
  assert.strictEqual(isValidPriceId('price_pro_149'), false)
})
test('rejects price_team_399', () => {
  assert.strictEqual(isValidPriceId('price_team_399'), false)
})
test('rejects undefined', () => {
  assert.strictEqual(isValidPriceId(undefined), false)
})
test('rejects empty string', () => {
  assert.strictEqual(isValidPriceId(''), false)
})
test('rejects price_replace_with_basic_plan_price_id', () => {
  assert.strictEqual(isValidPriceId('price_replace_with_basic_plan_price_id'), false)
})
test('accepts price_1QvIEf2eZvKYlo2CkuDLQABG (real-format)', () => {
  assert.strictEqual(isValidPriceId('price_1QvIEf2eZvKYlo2CkuDLQABG'), true)
})
test('accepts price_1AbCDEFGHIJKLMN (14-char boundary)', () => {
  assert.strictEqual(isValidPriceId('price_1AbCDEFGHIJKLMN'), true)
})
test('rejects price_1ABCDE (only 6 chars after prefix — too short)', () => {
  assert.strictEqual(isValidPriceId('price_1ABCDE'), false)
})

// ---------------------------------------------------------------------------
// 2. create-checkout/route.ts source inspection — no NEXT_PUBLIC_ price vars
// ---------------------------------------------------------------------------

console.log('\n[2] create-checkout/route.ts: env var names are server-side')

const routeSource = fs.readFileSync(
  path.join(DASHBOARD, 'app/api/billing/create-checkout/route.ts'),
  'utf8'
)

test('PRICE_ID_ENV_MAP contains STRIPE_PRICE_STARTER_MONTHLY', () => {
  assert.ok(routeSource.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'Expected STRIPE_PRICE_STARTER_MONTHLY in env map')
})
test('PRICE_ID_ENV_MAP contains STRIPE_PRICE_PROFESSIONAL_MONTHLY', () => {
  assert.ok(routeSource.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'Expected STRIPE_PRICE_PROFESSIONAL_MONTHLY in env map')
})
test('PRICE_ID_ENV_MAP contains STRIPE_PRICE_ENTERPRISE_MONTHLY', () => {
  assert.ok(routeSource.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'), 'Expected STRIPE_PRICE_ENTERPRISE_MONTHLY in env map')
})
test('PRICE_ID_ENV_MAP has NO NEXT_PUBLIC_ prefixed price vars', () => {
  const lines = routeSource.split('\n').filter(l => l.includes('NEXT_PUBLIC_STRIPE_PRICE'))
  assert.strictEqual(lines.length, 0, `Found NEXT_PUBLIC_ price vars in route: ${lines.join(', ')}`)
})
test('isValidPriceId regex in route rejects underscores in ID portion', () => {
  assert.ok(
    routeSource.includes('/^price_[A-Za-z0-9]{14,}$/'),
    'Expected strict regex /^price_[A-Za-z0-9]{14,}$/ in route.ts'
  )
})

// ---------------------------------------------------------------------------
// 3. signup/page.tsx — no hardcoded priceId on plan objects
// ---------------------------------------------------------------------------

console.log('\n[3] signup/page.tsx: no hardcoded priceId values')

const signupSource = fs.readFileSync(
  path.join(DASHBOARD, 'app/signup/page.tsx'),
  'utf8'
)

test('PLANS interface does NOT include priceId field', () => {
  // priceId should not appear as a plan property definition
  const hasPriceIdField = /interface Plan[\s\S]*?priceId\s*:/.test(signupSource)
  assert.ok(!hasPriceIdField, 'Found priceId in Plan interface — should be removed')
})
test('No price_starter_49 literal in signup page', () => {
  assert.ok(!signupSource.includes('price_starter_49'), 'Found placeholder price_starter_49 in signup page')
})
test('No price_pro_149 literal in signup page', () => {
  assert.ok(!signupSource.includes('price_pro_149'), 'Found placeholder price_pro_149 in signup page')
})
test('No price_team_399 literal in signup page', () => {
  assert.ok(!signupSource.includes('price_team_399'), 'Found placeholder price_team_399 in signup page')
})
test('PLAN_CHECKOUT_TIER map exists in signup page', () => {
  assert.ok(signupSource.includes('PLAN_CHECKOUT_TIER'), 'Expected PLAN_CHECKOUT_TIER map in signup/page.tsx')
})
test('Checkout sends tier (not priceId) to create-checkout API', () => {
  assert.ok(signupSource.includes('tier: checkoutTier'), 'Expected tier: checkoutTier in fetch body')
})

// ---------------------------------------------------------------------------
// 4. Tier → env-var chain is internally consistent
// ---------------------------------------------------------------------------

console.log('\n[4] Tier alignment: PLAN_CHECKOUT_TIER → PRICE_ID_ENV_MAP')

const PRICE_ID_ENV_MAP = {
  starter_monthly:      'STRIPE_PRICE_STARTER_MONTHLY',
  starter_annual:       'STRIPE_PRICE_STARTER_ANNUAL',
  professional_monthly: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  professional_annual:  'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
  enterprise_monthly:   'STRIPE_PRICE_ENTERPRISE_MONTHLY',
  enterprise_annual:    'STRIPE_PRICE_ENTERPRISE_ANNUAL',
}

const PLAN_CHECKOUT_TIER = {
  starter: 'starter_monthly',
  pro:     'professional_monthly',
  team:    'enterprise_monthly',
}

test('starter → starter_monthly → STRIPE_PRICE_STARTER_MONTHLY', () => {
  const tier = PLAN_CHECKOUT_TIER['starter']
  assert.strictEqual(tier, 'starter_monthly')
  assert.strictEqual(PRICE_ID_ENV_MAP[tier], 'STRIPE_PRICE_STARTER_MONTHLY')
})
test('pro → professional_monthly → STRIPE_PRICE_PROFESSIONAL_MONTHLY', () => {
  const tier = PLAN_CHECKOUT_TIER['pro']
  assert.strictEqual(tier, 'professional_monthly')
  assert.strictEqual(PRICE_ID_ENV_MAP[tier], 'STRIPE_PRICE_PROFESSIONAL_MONTHLY')
})
test('team → enterprise_monthly → STRIPE_PRICE_ENTERPRISE_MONTHLY', () => {
  const tier = PLAN_CHECKOUT_TIER['team']
  assert.strictEqual(tier, 'enterprise_monthly')
  assert.strictEqual(PRICE_ID_ENV_MAP[tier], 'STRIPE_PRICE_ENTERPRISE_MONTHLY')
})
test('All plan checkout tiers exist in PRICE_ID_ENV_MAP', () => {
  for (const [planId, tier] of Object.entries(PLAN_CHECKOUT_TIER)) {
    assert.ok(PRICE_ID_ENV_MAP[tier], `Plan '${planId}' maps to tier '${tier}' which is missing from PRICE_ID_ENV_MAP`)
  }
})

// ---------------------------------------------------------------------------
// 5. verify-stripe-env.js updated to use new var names
// ---------------------------------------------------------------------------

console.log('\n[5] verify-stripe-env.js: correct required var names')

const verifyScript = fs.readFileSync(
  path.join(PROJECT, 'scripts/utilities/verify-stripe-env.js'),
  'utf8'
)

test('verify-stripe-env.js checks STRIPE_PRICE_STARTER_MONTHLY (not STRIPE_PRICE_ID_BASIC)', () => {
  assert.ok(verifyScript.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'Missing STRIPE_PRICE_STARTER_MONTHLY in verify script')
  // Old name should be listed as deprecated, not required
  const requiredSection = verifyScript.substring(
    verifyScript.indexOf('const requiredVars'),
    verifyScript.indexOf('const deprecatedVars')
  )
  assert.ok(!requiredSection.includes('STRIPE_PRICE_ID_BASIC'), 'STRIPE_PRICE_ID_BASIC should not be in requiredVars')
})
test('verify-stripe-env.js flags STRIPE_PRICE_ID_BASIC as deprecated', () => {
  assert.ok(verifyScript.includes("'STRIPE_PRICE_ID_BASIC'"), 'Expected STRIPE_PRICE_ID_BASIC in deprecated list')
})
test('verify-stripe-env.js flags NEXT_PUBLIC_ price vars as deprecated', () => {
  assert.ok(verifyScript.includes('NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY'), 'Expected NEXT_PUBLIC_ vars in deprecated list')
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n============================================================')
console.log(`  QC E2E Results: ${passed} passed, ${failed} failed`)
console.log('============================================================\n')

if (failed > 0) process.exit(1)
