'use strict'

/**
 * QC E2E test for PR #1877 — Stripe checkout env var name fix
 * Task: 72fcf7e2-219a-49cc-b47b-2a09137a6358
 *
 * Verifies that the PR branch (dev/69b2fedf) correctly fixes:
 * 1. upgrade-checkout/route.ts: PROFESSIONAL_MONTHLY → PRO_MONTHLY,
 *    ENTERPRISE_MONTHLY → TEAM_MONTHLY, removes invalid fallbacks, adds 503 guard
 * 2. create-checkout-session/route.ts: PROFESSIONAL_MONTHLY → PRO_MONTHLY
 * 3. Regression test file is present and has correct assertions
 *
 * Also documents known remaining technical debt (out of scope for this PR).
 */

const assert = require('assert')
const { execSync } = require('child_process')
const path = require('path')

const REPO = '/Users/clawdbot/projects/leadflow'
const PR_BRANCH = 'origin/dev/69b2fedf-fix-retry-zero-conversions-no-paying-cus'

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

function gitShow(filePath) {
  return execSync(`git -C ${REPO} show ${PR_BRANCH}:${filePath}`, { encoding: 'utf8' })
}

// ── 1. upgrade-checkout/route.ts in PR branch ─────────────────────────────
console.log('\n[1] upgrade-checkout/route.ts — PR branch fixes')
const upgradeCheckout = gitShow('product/lead-response/dashboard/app/api/stripe/upgrade-checkout/route.ts')

test('pro plan uses STRIPE_PRICE_PRO_MONTHLY', () => {
  assert.ok(upgradeCheckout.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Missing STRIPE_PRICE_PRO_MONTHLY')
  assert.ok(!upgradeCheckout.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'Stale STRIPE_PRICE_PROFESSIONAL_MONTHLY present')
})

test('team plan uses STRIPE_PRICE_TEAM_MONTHLY (not ENTERPRISE)', () => {
  assert.ok(upgradeCheckout.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Missing STRIPE_PRICE_TEAM_MONTHLY')
  assert.ok(!upgradeCheckout.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'), 'Stale STRIPE_PRICE_ENTERPRISE_MONTHLY present')
})

test('no invalid Stripe fallback strings', () => {
  assert.ok(!upgradeCheckout.includes("'price_professional_monthly'"), "Invalid fallback 'price_professional_monthly' present")
  assert.ok(!upgradeCheckout.includes("'price_enterprise_monthly'"), "Invalid fallback 'price_enterprise_monthly' present")
  assert.ok(!upgradeCheckout.includes("'price_starter_monthly'"), "Invalid fallback 'price_starter_monthly' present")
})

test('503 PRICE_NOT_CONFIGURED guard is present', () => {
  assert.ok(upgradeCheckout.includes('PRICE_NOT_CONFIGURED'), 'Missing PRICE_NOT_CONFIGURED error code')
  assert.ok(
    upgradeCheckout.includes('status: 503') || upgradeCheckout.includes('{ status: 503 }'),
    'Missing 503 status for unconfigured price'
  )
})

test('price ID validated before Stripe call (startsWith guard)', () => {
  assert.ok(upgradeCheckout.includes("startsWith('price_')"), "Missing startsWith('price_') validation guard")
})

test('PLAN_PRICE_IDS typed as string | undefined (no invalid fallback possible)', () => {
  assert.ok(
    upgradeCheckout.includes('string | undefined'),
    'Missing string | undefined type — fallback values could re-enter'
  )
})

// ── 2. create-checkout-session/route.ts in PR branch ──────────────────────
console.log('\n[2] create-checkout-session/route.ts — PR branch fix')
const createCheckoutSession = gitShow('product/lead-response/dashboard/app/api/billing/create-checkout-session/route.ts')

test('pro plan uses STRIPE_PRICE_PRO_MONTHLY', () => {
  assert.ok(createCheckoutSession.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Missing STRIPE_PRICE_PRO_MONTHLY')
  assert.ok(!createCheckoutSession.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'Stale STRIPE_PRICE_PROFESSIONAL_MONTHLY present')
})

test('team plan still uses STRIPE_PRICE_TEAM_MONTHLY (unchanged and correct)', () => {
  assert.ok(createCheckoutSession.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Missing STRIPE_PRICE_TEAM_MONTHLY')
})

// ── 3. Regression test present in PR branch ──────────────────────────────
console.log('\n[3] Regression test file in PR branch')
const regressionTest = gitShow('tests/integration/fix-stripe-checkout-wrong-env-var-names.test.js')

test('regression test file exists in PR branch', () => {
  assert.ok(regressionTest.length > 100, 'Regression test file appears empty')
})

test('regression test covers upgrade-checkout env var names', () => {
  assert.ok(regressionTest.includes('upgrade-checkout'), 'Does not reference upgrade-checkout')
  assert.ok(regressionTest.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Does not assert PRO_MONTHLY')
  assert.ok(regressionTest.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Does not assert TEAM_MONTHLY')
})

test('regression test checks no-invalid-fallback (PRICE_NOT_CONFIGURED guard)', () => {
  assert.ok(regressionTest.includes('PRICE_NOT_CONFIGURED'), 'Regression test does not verify 503 guard code')
})

// ── 4. create-checkout/route.ts (canonical route — already correct pre-PR) ──
console.log('\n[4] create-checkout/route.ts — confirm already correct (not touched by PR)')
const createCheckout = gitShow('product/lead-response/dashboard/app/api/billing/create-checkout/route.ts')

test('create-checkout uses PRO_MONTHLY and TEAM_MONTHLY', () => {
  assert.ok(createCheckout.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Missing PRO_MONTHLY')
  assert.ok(createCheckout.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Missing TEAM_MONTHLY')
  assert.ok(!createCheckout.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'Stale PROFESSIONAL_MONTHLY in untouched route')
})

// ── 5. Known remaining technical debt (documented, not blocking) ───────────
console.log('\n[5] Remaining tech debt — documented, out of scope for this PR')

const nudgeRoute = gitShow('product/lead-response/dashboard/app/api/trial/nudge/route.ts')
const webhookRoute = gitShow('product/lead-response/dashboard/app/api/webhooks/stripe/route.ts')

let debtCount = 0
if (nudgeRoute.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY')) {
  console.log('  ⚠️  nudge/route.ts still uses STRIPE_PRICE_PROFESSIONAL_MONTHLY — needs follow-up')
  debtCount++
}
if (webhookRoute.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY')) {
  console.log('  ⚠️  webhooks/stripe/route.ts still uses STRIPE_PRICE_PROFESSIONAL_MONTHLY — needs follow-up')
  debtCount++
}
if (debtCount === 0) {
  console.log('  ✅ No remaining tech debt found')
  passed++
} else {
  console.log(`  ℹ️  ${debtCount} route(s) with old env var names — tracked, not blocking this PR`)
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (debtCount > 0) {
  console.log(`Note: ${debtCount} out-of-scope route(s) still use old env var names`)
}
if (failed > 0) {
  console.error('\n❌ QC tests FAILED — PR should not be approved')
  process.exit(1)
} else {
  console.log('\n✅ All QC tests passed — PR ready for approval')
}
