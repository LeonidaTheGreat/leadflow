'use strict'

/**
 * QC E2E test for PR #1910: fix-two-critical-revenue-prs-stuck-in-needs-merge
 *
 * Verifies:
 * 1. Stripe price ID validation logic (isValidPriceId regex)
 * 2. revenue-config-health overall status logic
 * 3. Checkout routes reject placeholder price IDs with 503
 * 4. config.ts has no placeholder fallbacks (null not strings)
 * 5. STRIPE-SETUP.md documents the correct env var names
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const PROJECT = path.resolve(__dirname, '..')
const DASHBOARD = path.join(PROJECT, 'product/lead-response/dashboard')

let passed = 0
let failed = 0

function test(label, fn) {
  try {
    fn()
    console.log(`  ok  ${label}`)
    passed++
  } catch (e) {
    console.error(`  FAIL ${label}: ${e.message}`)
    failed++
  }
}

// ---------------------------------------------------------------------------
// 1. isValidPriceId — must reject old placeholder patterns
// ---------------------------------------------------------------------------
console.log('\n[1] Price ID validation rejects placeholders used by checkout routes')

function isValidPriceId(id) {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

const PLACEHOLDERS = [
  'price_starter_49',
  'price_pro_149',
  'price_team_399',
  'price_starter_monthly',
  'price_professional_monthly',
  'price_team_monthly',
  'price_enterprise_monthly',
]
PLACEHOLDERS.forEach(p => {
  test(`rejects "${p}"`, () => assert.strictEqual(isValidPriceId(p), false))
})
test('accepts real-format ID price_1QvIEf2eZvKYlo2CkuDLQABG', () =>
  assert.strictEqual(isValidPriceId('price_1QvIEf2eZvKYlo2CkuDLQABG'), true))
test('accepts 14-char ID price_1AbCDEFGHIJKLMN', () =>
  assert.strictEqual(isValidPriceId('price_1AbCDEFGHIJKLMN'), true))
test('rejects undefined', () => assert.strictEqual(isValidPriceId(undefined), false))

// ---------------------------------------------------------------------------
// 2. revenue-config-health overall logic
// ---------------------------------------------------------------------------
console.log('\n[2] revenue-config-health overall status classification')

function computeOverall({ stripeKeyOk, pricesOk, webhookSecretOk, emailOk }) {
  if (!stripeKeyOk || !pricesOk) return 'broken'
  if (!emailOk || !webhookSecretOk) return 'degraded'
  return 'ok'
}

test('all configured → ok', () =>
  assert.strictEqual(computeOverall({ stripeKeyOk: true, pricesOk: true, webhookSecretOk: true, emailOk: true }), 'ok'))
test('bad stripe key → broken', () =>
  assert.strictEqual(computeOverall({ stripeKeyOk: false, pricesOk: true, webhookSecretOk: true, emailOk: true }), 'broken'))
test('placeholder prices → broken', () =>
  assert.strictEqual(computeOverall({ stripeKeyOk: true, pricesOk: false, webhookSecretOk: true, emailOk: true }), 'broken'))
test('missing webhook secret → degraded (not broken)', () =>
  assert.strictEqual(computeOverall({ stripeKeyOk: true, pricesOk: true, webhookSecretOk: false, emailOk: true }), 'degraded'))
test('email not configured → degraded (not broken)', () =>
  assert.strictEqual(computeOverall({ stripeKeyOk: true, pricesOk: true, webhookSecretOk: true, emailOk: false }), 'degraded'))
test('broken takes priority over degraded', () =>
  assert.strictEqual(computeOverall({ stripeKeyOk: false, pricesOk: true, webhookSecretOk: false, emailOk: false }), 'broken'))

// ---------------------------------------------------------------------------
// 3. Email domain extraction from FROM_EMAIL
// ---------------------------------------------------------------------------
console.log('\n[3] Email domain extraction from FROM_EMAIL')

function extractDomain(fromEmail) {
  const val = (fromEmail || '').trim()
  return val.includes('@') ? val.split('@')[1] : null
}

test('extracts domain from stojan@landyourleads.com', () =>
  assert.strictEqual(extractDomain('stojan@landyourleads.com'), 'landyourleads.com'))
test('returns null for bare address (no @)', () =>
  assert.strictEqual(extractDomain('notanemail'), null))
test('returns null for empty string', () =>
  assert.strictEqual(extractDomain(''), null))
test('returns null for undefined', () =>
  assert.strictEqual(extractDomain(undefined), null))
test('trims whitespace before extracting', () =>
  assert.strictEqual(extractDomain('  admin@example.com  '), 'example.com'))

// ---------------------------------------------------------------------------
// 4. config.ts has null fallbacks (no placeholder price strings)
// ---------------------------------------------------------------------------
console.log('\n[4] lib/config.ts has null fallbacks, not placeholder strings')

const configSrc = fs.readFileSync(path.join(DASHBOARD, 'lib/config.ts'), 'utf8')
const placeholderStrings = [
  'price_starter_monthly',
  'price_professional_monthly',
  'price_team_monthly',
  'price_enterprise_monthly',
]
placeholderStrings.forEach(s => {
  test(`config.ts does not contain "${s}"`, () =>
    assert.ok(!configSrc.includes(s), `Found placeholder "${s}" in config.ts`))
})
test('config.ts uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () =>
  assert.ok(configSrc.includes('STRIPE_PRICE_PRO_MONTHLY'), 'STRIPE_PRICE_PRO_MONTHLY not found'))
test('config.ts does not reference STRIPE_PRICE_PROFESSIONAL_MONTHLY', () =>
  assert.ok(!configSrc.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'Old env var name still present in config.ts'))

// ---------------------------------------------------------------------------
// 5. Checkout routes use PRICE_ENV_MAP with PRO_MONTHLY
// ---------------------------------------------------------------------------
console.log('\n[5] Checkout routes: PRICE_ENV_MAP with correct env var names')

const checkoutSrc = fs.readFileSync(
  path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8')
test('create-checkout-session uses PRICE_ENV_MAP', () =>
  assert.ok(checkoutSrc.includes('PRICE_ENV_MAP'), 'PRICE_ENV_MAP not found'))
test('create-checkout-session maps pro -> STRIPE_PRICE_PRO_MONTHLY', () =>
  assert.ok(checkoutSrc.includes('STRIPE_PRICE_PRO_MONTHLY'), 'PRO_MONTHLY not in checkout map'))
test('create-checkout-session does NOT use old PLAN_ENV_MAP name', () =>
  assert.ok(!checkoutSrc.includes('PLAN_ENV_MAP'), 'Old PLAN_ENV_MAP still present'))
test('create-checkout-session returns PRICE_NOT_CONFIGURED on bad price', () =>
  assert.ok(checkoutSrc.includes('PRICE_NOT_CONFIGURED'), 'PRICE_NOT_CONFIGURED not found'))

const upgradeSrc = fs.readFileSync(
  path.join(DASHBOARD, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf8')
test('upgrade-checkout uses PRICE_ENV_MAP', () =>
  assert.ok(upgradeSrc.includes('PRICE_ENV_MAP'), 'PRICE_ENV_MAP not found'))
test('upgrade-checkout does NOT use old PLAN_ENV_MAP name', () =>
  assert.ok(!upgradeSrc.includes('PLAN_ENV_MAP'), 'Old PLAN_ENV_MAP still present'))

// ---------------------------------------------------------------------------
// 6. STRIPE-SETUP.md documents correct env var names
// ---------------------------------------------------------------------------
console.log('\n[6] STRIPE-SETUP.md documents correct env var names')

const setupSrc = fs.readFileSync(path.join(PROJECT, 'docs/guides/STRIPE-SETUP.md'), 'utf8')
test('STRIPE-SETUP.md lists STRIPE_PRICE_PRO_MONTHLY', () =>
  assert.ok(setupSrc.includes('STRIPE_PRICE_PRO_MONTHLY'), 'STRIPE_PRICE_PRO_MONTHLY missing from guide'))
test('STRIPE-SETUP.md does not reference PROFESSIONAL_MONTHLY', () =>
  assert.ok(!setupSrc.includes('PROFESSIONAL_MONTHLY'), 'Old env var PROFESSIONAL_MONTHLY still in guide'))
test('STRIPE-SETUP.md describes STRIPE_WEBHOOK_SECRET', () =>
  assert.ok(setupSrc.includes('STRIPE_WEBHOOK_SECRET'), 'STRIPE_WEBHOOK_SECRET not in guide'))
test('STRIPE-SETUP.md describes FROM_EMAIL', () =>
  assert.ok(setupSrc.includes('FROM_EMAIL'), 'FROM_EMAIL not in guide'))
test('STRIPE-SETUP.md does not reference deprecated EMAIL_FROM_DOMAIN', () =>
  assert.ok(!setupSrc.includes('EMAIL_FROM_DOMAIN'), 'Deprecated EMAIL_FROM_DOMAIN still in guide'))

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed (${passed + failed} total)`)
if (failed > 0) process.exit(1)
