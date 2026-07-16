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

function isValidPriceId(id) {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

// ---------------------------------------------------------------------------
// 1. revenue-config-health endpoint exists and has correct structure
// ---------------------------------------------------------------------------
console.log('\n[1] Revenue config health endpoint')

test('route.ts exists', () => {
  const p = path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts')
  assert.ok(fs.existsSync(p), 'route.ts not found')
})

test('checks STRIPE_SECRET_KEY format', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8')
  assert.ok(src.includes('sk_(live|test)'), 'should validate sk_live_ or sk_test_ format')
})

test('checks all 6 price env vars', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8')
  for (const v of [
    'STRIPE_PRICE_STARTER_MONTHLY', 'STRIPE_PRICE_STARTER_ANNUAL',
    'STRIPE_PRICE_PRO_MONTHLY', 'STRIPE_PRICE_PRO_ANNUAL',
    'STRIPE_PRICE_TEAM_MONTHLY', 'STRIPE_PRICE_TEAM_ANNUAL',
  ]) {
    assert.ok(src.includes(v), `should check ${v}`)
  }
})

test('returns overall status field', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8')
  assert.ok(src.includes('overall'), 'should return overall status')
  assert.ok(src.includes("'ok'") || src.includes('"ok"'), 'should have ok status')
  assert.ok(src.includes("'degraded'") || src.includes('"degraded"'), 'should have degraded status')
  assert.ok(src.includes("'broken'") || src.includes('"broken"'), 'should have broken status')
})

test('supports LEADFLOW_API_KEY auth', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8')
  assert.ok(src.includes('LEADFLOW_API_KEY'), 'should support API key auth')
})

test('checks RESEND_API_KEY and FROM_EMAIL', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8')
  assert.ok(src.includes('RESEND_API_KEY'), 'should check RESEND_API_KEY')
  assert.ok(src.includes('FROM_EMAIL'), 'should check FROM_EMAIL')
})

// ---------------------------------------------------------------------------
// 2. Checkout routes validate price IDs — no placeholder fallbacks
// ---------------------------------------------------------------------------
console.log('\n[2] Checkout routes reject placeholder price IDs')

test('create-checkout-session uses isValidPriceId', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8')
  assert.ok(src.includes('isValidPriceId'), 'should have isValidPriceId guard')
  assert.ok(!src.includes("|| ''"), 'should not fallback to empty string')
})

test('create-checkout-session returns 503 for missing price', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8')
  assert.ok(src.includes('PRICE_NOT_CONFIGURED') || src.includes('503'), 'should return 503')
})

test('upgrade-checkout has no placeholder fallback strings', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf8')
  assert.ok(!src.includes("'price_starter_monthly'"), 'should not have price_starter_monthly fallback')
  assert.ok(!src.includes("'price_professional_monthly'"), 'should not have price_professional_monthly fallback')
  assert.ok(!src.includes("'price_enterprise_monthly'"), 'should not have price_enterprise_monthly fallback')
})

test('upgrade-checkout validates price IDs', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf8')
  assert.ok(src.includes('isValidPriceId'), 'should have isValidPriceId guard')
})

test('upgrade-checkout returns 503 for missing price', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf8')
  assert.ok(src.includes('PRICE_NOT_CONFIGURED'), 'should return PRICE_NOT_CONFIGURED')
})

// ---------------------------------------------------------------------------
// 3. Config has no placeholder price strings
// ---------------------------------------------------------------------------
console.log('\n[3] Dashboard config — no placeholder price fallbacks')

test('config.ts uses null fallback instead of placeholder strings', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'lib/config.ts'), 'utf8')
  assert.ok(!src.includes("'price_starter_monthly'"), 'should not have price_starter_monthly')
  assert.ok(!src.includes("'price_professional_monthly'"), 'should not have price_professional_monthly')
  assert.ok(!src.includes("'price_team_monthly'"), 'should not have price_team_monthly')
  assert.ok(!src.includes("'price_enterprise_monthly'"), 'should not have price_enterprise_monthly')
})

test('config.ts uses consistent env var names (PRO not PROFESSIONAL)', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'lib/config.ts'), 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'should use STRIPE_PRICE_PRO_MONTHLY')
  assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'should not use PROFESSIONAL naming')
})

// ---------------------------------------------------------------------------
// 4. isValidPriceId function correctness
// ---------------------------------------------------------------------------
console.log('\n[4] isValidPriceId correctness')

test('accepts real Stripe price ID', () => {
  assert.ok(isValidPriceId('price_1QvIEf2eZvKYlo2CkuDLQABG'))
})

test('rejects placeholder price_starter_49', () => {
  assert.ok(!isValidPriceId('price_starter_49'))
})

test('rejects placeholder price_pro_149', () => {
  assert.ok(!isValidPriceId('price_pro_149'))
})

test('rejects empty string', () => {
  assert.ok(!isValidPriceId(''))
})

test('rejects undefined', () => {
  assert.ok(!isValidPriceId(undefined))
})

test('rejects price_ with underscores (placeholder pattern)', () => {
  assert.ok(!isValidPriceId('price_starter_monthly'))
})

// ---------------------------------------------------------------------------
// 5. Activation page shows revenue config banner
// ---------------------------------------------------------------------------
console.log('\n[5] Activation page revenue config banner')

test('activation page imports and renders RevenueConfigBanner', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/admin/activation/page.tsx'), 'utf8')
  assert.ok(src.includes('RevenueConfigBanner'), 'should render RevenueConfigBanner')
  assert.ok(src.includes('revenue-config-health'), 'should fetch from health endpoint')
})

// ---------------------------------------------------------------------------
// 6. STRIPE-SETUP.md exists with required content
// ---------------------------------------------------------------------------
console.log('\n[6] STRIPE-SETUP.md guide')

test('guide exists', () => {
  assert.ok(fs.existsSync(path.join(PROJECT, 'docs/guides/STRIPE-SETUP.md')))
})

test('lists all 3 tiers', () => {
  const src = fs.readFileSync(path.join(PROJECT, 'docs/guides/STRIPE-SETUP.md'), 'utf8')
  assert.ok(src.includes('Starter'), 'should mention Starter tier')
  assert.ok(src.includes('Pro'), 'should mention Pro tier')
  assert.ok(src.includes('Team'), 'should mention Team tier')
})

test('lists exact env var names', () => {
  const src = fs.readFileSync(path.join(PROJECT, 'docs/guides/STRIPE-SETUP.md'), 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'should list STRIPE_PRICE_STARTER_MONTHLY')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'should list STRIPE_PRICE_PRO_MONTHLY')
  assert.ok(src.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'should list STRIPE_PRICE_TEAM_MONTHLY')
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed (${passed + failed} total)`)
if (failed > 0) process.exit(1)
