/**
 * QC-authored test for PR #1897 — Stripe Checkout Unblock
 * Tests the core logic in isolation (no HTTP needed)
 */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD = path.join(__dirname, '../../product/lead-response/dashboard')

let passed = 0
let failed = 0

function check(label, fn) {
  try {
    fn()
    console.log(`PASS: ${label}`)
    passed++
  } catch (err) {
    console.error(`FAIL: ${label} — ${err.message}`)
    failed++
  }
}

// ---- isValidPriceId logic verification (extracted from source) ----
function isValidPriceId(id) {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

check('isValidPriceId rejects undefined', () => {
  assert.ok(!isValidPriceId(undefined))
})
check('isValidPriceId rejects empty string', () => {
  assert.ok(!isValidPriceId(''))
})
check('isValidPriceId rejects placeholder price_starter_49', () => {
  assert.ok(!isValidPriceId('price_starter_49'), 'placeholder must be rejected')
})
check('isValidPriceId rejects placeholder price_pro_149', () => {
  assert.ok(!isValidPriceId('price_pro_149'), 'placeholder must be rejected')
})
check('isValidPriceId rejects placeholder price_replace_me', () => {
  assert.ok(!isValidPriceId('price_replace_me'), 'old placeholder must be rejected')
})
check('isValidPriceId accepts valid Stripe price ID (16 chars)', () => {
  assert.ok(isValidPriceId('price_1QvIEf2eZvKYlo2C'), 'valid real-world ID must pass')
})
check('isValidPriceId accepts valid Stripe price ID (24 chars)', () => {
  assert.ok(isValidPriceId('price_1QvIEf2eZvKYlo2CkuDLQ'))
})
check('isValidPriceId rejects ID with underscore in suffix', () => {
  assert.ok(!isValidPriceId('price_starter_monthly'), 'underscore in suffix must fail')
})
check('isValidPriceId rejects too-short suffix (13 chars)', () => {
  assert.ok(!isValidPriceId('price_1234567890123'), 'min 14 chars after price_')
})

// ---- overall status logic (simulated from route.ts) ----
function computeOverall(stripeOk, stripeKeyValid, priceMissingCount, emailOk) {
  return stripeOk && emailOk ? 'ok' :
    (!stripeKeyValid || priceMissingCount > 0) ? 'broken' : 'degraded'
}

check('overall = ok when stripe + email both ok', () => {
  assert.strictEqual(computeOverall(true, true, 0, true), 'ok')
})
check('overall = broken when stripe key invalid', () => {
  assert.strictEqual(computeOverall(false, false, 0, true), 'broken')
})
check('overall = broken when price IDs missing', () => {
  assert.strictEqual(computeOverall(false, true, 3, true), 'broken')
})
check('overall = degraded when prices invalid format (not missing)', () => {
  assert.strictEqual(computeOverall(false, true, 0, true), 'degraded')
})
check('overall = degraded when only email broken', () => {
  assert.strictEqual(computeOverall(true, true, 0, false), 'degraded')
})

// ---- PLAN_ENV_MAP consistency between checkout routes ----
check('create-checkout-session and upgrade-checkout use same env var names', () => {
  const src1 = fs.readFileSync(path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8')
  const src2 = fs.readFileSync(path.join(DASHBOARD, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf8')
  for (const plan of ['STARTER', 'PRO', 'TEAM']) {
    const envVar = `STRIPE_PRICE_${plan}_MONTHLY`
    assert.ok(src1.includes(envVar), `${envVar} missing from create-checkout-session`)
    assert.ok(src2.includes(envVar), `${envVar} missing from upgrade-checkout`)
  }
})

// ---- Auth: revenue-config-health must support both API key + session ----
check('revenue-config-health supports dual auth (API key + session)', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8')
  assert.ok(src.includes('LEADFLOW_API_KEY'), 'must check API key')
  assert.ok(src.includes('requireAdmin'), 'must check admin session')
  assert.ok(src.includes('401'), 'must return 401 on failure')
})

// ---- No secrets in diff ----
check('revenue-config-health contains no hardcoded secrets', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8')
  assert.ok(!/sk_(live|test)_[A-Za-z0-9]+/.test(src), 'no hardcoded Stripe key')
  assert.ok(!/whsec_[A-Za-z0-9]+/.test(src), 'no hardcoded webhook secret')
  assert.ok(!/re_[A-Za-z0-9]+/.test(src), 'no hardcoded Resend key')
})

console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed}`)
if (failed > 0) process.exit(1)
