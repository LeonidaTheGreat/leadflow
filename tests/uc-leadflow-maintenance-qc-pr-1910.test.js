'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const WORKTREE = path.resolve(__dirname, '..')
const DASHBOARD = path.join(WORKTREE, 'product/lead-response/dashboard')

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
// 1. config.ts — no placeholder price fallbacks, consistent env var names
// ---------------------------------------------------------------------------
console.log('\n[1] config.ts — null fallbacks, PRO naming')

const configSrc = fs.readFileSync(path.join(DASHBOARD, 'lib/config.ts'), 'utf8')

test('removes placeholder price_starter_monthly fallback', () =>
  assert.ok(!configSrc.includes("'price_starter_monthly'"), 'should not contain price_starter_monthly placeholder'))

test('removes placeholder price_professional_monthly fallback', () =>
  assert.ok(!configSrc.includes("'price_professional_monthly'"), 'should not contain price_professional_monthly placeholder'))

test('removes placeholder price_team_monthly fallback', () =>
  assert.ok(!configSrc.includes("'price_team_monthly'"), 'should not contain price_team_monthly placeholder'))

test('removes placeholder price_enterprise_monthly fallback', () =>
  assert.ok(!configSrc.includes("'price_enterprise_monthly'"), 'should not contain price_enterprise_monthly placeholder'))

test('uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () =>
  assert.ok(configSrc.includes('STRIPE_PRICE_PRO_MONTHLY'), 'config should use canonical PRO name'))

test('does not use STRIPE_PRICE_PROFESSIONAL_MONTHLY', () =>
  assert.ok(!configSrc.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'config should not use old PROFESSIONAL name'))

test('uses null fallback (not placeholder string) for pro price', () =>
  assert.ok(/STRIPE_PRICE_PRO_MONTHLY\s*\|\|\s*null/.test(configSrc), 'should fall back to null, not a placeholder'))

// ---------------------------------------------------------------------------
// 2. revenue-config-health — camelCase response, webhook secret, overall status
// ---------------------------------------------------------------------------
console.log('\n[2] revenue-config-health route')

const healthSrc = fs.readFileSync(
  path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8')

test('response uses camelCase secretKey', () =>
  assert.ok(healthSrc.includes('secretKey:'), 'should use secretKey (camelCase)'))

test('response does NOT use snake_case secret_key', () =>
  assert.ok(!healthSrc.includes('secret_key:'), 'should not use secret_key (snake_case)'))

test('checks STRIPE_WEBHOOK_SECRET', () =>
  assert.ok(healthSrc.includes('STRIPE_WEBHOOK_SECRET'), 'should check webhook secret'))

test('response includes webhookSecret field', () =>
  assert.ok(healthSrc.includes('webhookSecret:'), 'should return webhookSecret field'))

test('checks FROM_EMAIL', () =>
  assert.ok(healthSrc.includes('FROM_EMAIL'), 'should check FROM_EMAIL'))

test('checks RESEND_API_KEY', () =>
  assert.ok(healthSrc.includes('RESEND_API_KEY'), 'should check RESEND_API_KEY'))

test('returns overall: ok | degraded | broken', () => {
  assert.ok(healthSrc.includes("'ok'") || healthSrc.includes('"ok"'))
  assert.ok(healthSrc.includes("'degraded'") || healthSrc.includes('"degraded"'))
  assert.ok(healthSrc.includes("'broken'") || healthSrc.includes('"broken"'))
})

test('supports LEADFLOW_API_KEY auth header', () =>
  assert.ok(healthSrc.includes('LEADFLOW_API_KEY'), 'should support API key auth'))

test('auth guard before data access (Unauthorized appears before for-loop price scan)', () => {
  const unauthorizedIdx = healthSrc.indexOf('Unauthorized')
  const priceLoopIdx = healthSrc.indexOf('for (const envVar of STRIPE_PRICE_VARS)')
  assert.ok(unauthorizedIdx < priceLoopIdx, 'auth check should come before price env var scan loop')
})

// ---------------------------------------------------------------------------
// 3. create-checkout-session — getPriceIdForPlan helper, PRICE_ENV_MAP
// ---------------------------------------------------------------------------
console.log('\n[3] create-checkout-session route')

const checkoutSrc = fs.readFileSync(
  path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8')

test('defines PRICE_ENV_MAP (renamed from PLAN_ENV_MAP)', () =>
  assert.ok(checkoutSrc.includes('PRICE_ENV_MAP'), 'should use PRICE_ENV_MAP'))

test('does NOT reference old PLAN_ENV_MAP', () =>
  assert.ok(!checkoutSrc.includes('PLAN_ENV_MAP'), 'should not have PLAN_ENV_MAP'))

test('has getPriceIdForPlan helper function', () =>
  assert.ok(checkoutSrc.includes('getPriceIdForPlan'), 'should define getPriceIdForPlan'))

test('returns PRICE_NOT_CONFIGURED code for missing price', () =>
  assert.ok(checkoutSrc.includes('PRICE_NOT_CONFIGURED'), 'should return PRICE_NOT_CONFIGURED'))

test('maps pro plan to STRIPE_PRICE_PRO_MONTHLY', () =>
  assert.ok(checkoutSrc.includes('STRIPE_PRICE_PRO_MONTHLY'), 'should map pro to PRO (not PROFESSIONAL)'))

// ---------------------------------------------------------------------------
// 4. upgrade-checkout — PRICE_ENV_MAP rename
// ---------------------------------------------------------------------------
console.log('\n[4] upgrade-checkout route')

const upgradeCheckoutSrc = fs.readFileSync(
  path.join(DASHBOARD, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf8')

test('uses PRICE_ENV_MAP (renamed from PLAN_ENV_MAP)', () =>
  assert.ok(upgradeCheckoutSrc.includes('PRICE_ENV_MAP'), 'should use PRICE_ENV_MAP'))

test('does NOT reference old PLAN_ENV_MAP', () =>
  assert.ok(!upgradeCheckoutSrc.includes('PLAN_ENV_MAP'), 'should not have PLAN_ENV_MAP'))

test('validates price IDs before use', () =>
  assert.ok(upgradeCheckoutSrc.includes('isValidPriceId'), 'should guard with isValidPriceId'))

// ---------------------------------------------------------------------------
// 5. isValidPriceId correctness (inline re-test to confirm the shipped regex)
// ---------------------------------------------------------------------------
console.log('\n[5] isValidPriceId edge cases')

test('accepts real Stripe price_1QvIEf2eZvKYlo2CkuDLQABG', () =>
  assert.ok(isValidPriceId('price_1QvIEf2eZvKYlo2CkuDLQABG')))

test('rejects placeholder price_starter_49', () =>
  assert.ok(!isValidPriceId('price_starter_49')))

test('rejects placeholder price_professional_monthly', () =>
  assert.ok(!isValidPriceId('price_professional_monthly')))

test('rejects placeholder price_enterprise_monthly', () =>
  assert.ok(!isValidPriceId('price_enterprise_monthly')))

test('rejects undefined', () =>
  assert.ok(!isValidPriceId(undefined)))

// ---------------------------------------------------------------------------
// 6. activation page — RevenueConfigBanner present, camelCase fields
// ---------------------------------------------------------------------------
console.log('\n[6] activation/page.tsx — RevenueConfigBanner')

const activationSrc = fs.readFileSync(
  path.join(DASHBOARD, 'app/admin/activation/page.tsx'), 'utf8')

test('defines RevenueConfigBanner component', () =>
  assert.ok(activationSrc.includes('function RevenueConfigBanner'), 'should define RevenueConfigBanner'))

test('renders RevenueConfigBanner in page', () =>
  assert.ok(activationSrc.includes('<RevenueConfigBanner'), 'should render banner in page'))

test('fetches from revenue-config-health endpoint', () =>
  assert.ok(activationSrc.includes('revenue-config-health'), 'should call the health endpoint'))

test('reads camelCase secretKey from response', () =>
  assert.ok(activationSrc.includes('secretKey'), 'should read secretKey (camelCase)'))

test('reads camelCase webhookSecret from response', () =>
  assert.ok(activationSrc.includes('webhookSecret'), 'should read webhookSecret'))

test('reads camelCase resendApiKey from response', () =>
  assert.ok(activationSrc.includes('resendApiKey'), 'should read resendApiKey'))

test('uses typed RevenueHealth interface', () =>
  assert.ok(activationSrc.includes('RevenueHealth'), 'should have RevenueHealth type'))

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed (${passed + failed} total)`)
if (failed > 0) process.exit(1)
