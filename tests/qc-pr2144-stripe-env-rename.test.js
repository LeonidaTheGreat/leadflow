'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

console.log('\n=== QC E2E: PR #2144 — Stripe env var rename completeness ===\n')

// ── 1. Runtime code has ZERO references to old env var names ─────────────────
const RUNTIME_FILES = [
  'lib/config/index.js',
  'lib/services/BillingService.js',
  path.join(DASHBOARD, 'app/api/trial/nudge/route.ts'),
  path.join(DASHBOARD, 'app/api/admin/sales-cockpit/payment-link/route.ts'),
  path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'),
  path.join(DASHBOARD, 'app/api/webhooks/stripe/route.ts'),
]

const OLD_NAMES = [
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_ENTERPRISE_MONTHLY',
  'STRIPE_PRICE_STARTER_YEARLY',
  'STRIPE_PRICE_PROFESSIONAL_YEARLY',
  'STRIPE_PRICE_ENTERPRISE_YEARLY',
]

for (const file of RUNTIME_FILES) {
  const abs = file.startsWith('/') ? file : path.join(ROOT, file)
  if (!fs.existsSync(abs)) continue
  const src = fs.readFileSync(abs, 'utf8')
  const basename = path.relative(ROOT, abs)
  for (const old of OLD_NAMES) {
    test(`${basename}: no stale ${old}`, () => {
      assert.ok(!src.includes(old), `${basename} still contains ${old}`)
    })
  }
}

// ── 2. New canonical names are present where expected ────────────────────────
const configSrc = fs.readFileSync(path.join(ROOT, 'lib/config/index.js'), 'utf8')
test('config: STRIPE_PRICE_PRO_MONTHLY is set', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_PRO_MONTHLY'))
})
test('config: STRIPE_PRICE_TEAM_MONTHLY is set', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_TEAM_MONTHLY'))
})
test('config: STRIPE_PRICE_STARTER_ANNUAL is set', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_STARTER_ANNUAL'))
})
test('config: STRIPE_PRICE_PRO_ANNUAL is set', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_PRO_ANNUAL'))
})
test('config: STRIPE_PRICE_TEAM_ANNUAL is set', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_TEAM_ANNUAL'))
})

// ── 3. Nudge route: regex validation for Stripe price IDs ────────────────────
const nudgeSrc = fs.readFileSync(
  path.join(DASHBOARD, 'app/api/trial/nudge/route.ts'), 'utf8'
)

test('nudge: no fallback string for PRO_PRICE_ID', () => {
  assert.ok(!nudgeSrc.includes("|| 'price_professional"), 'still has invalid fallback')
  assert.ok(!nudgeSrc.includes("|| 'price_pro"), 'should not have any fallback string')
})

test('nudge: uses regex guard (not startsWith)', () => {
  assert.ok(!nudgeSrc.includes('startsWith'), 'still using old startsWith guard')
  assert.ok(nudgeSrc.includes('/^price_[A-Za-z0-9]{14,36}$/'), 'missing regex guard')
})

// Verify the regex accepts valid Stripe price IDs and rejects invalid ones
const regex = /^price_[A-Za-z0-9]{14,36}$/
test('regex: accepts real Stripe price ID (24 chars after prefix)', () => {
  assert.ok(regex.test('price_1MoBy5LkdIwHu7ixZhnattbh'))
})
test('regex: accepts test mode price ID', () => {
  assert.ok(regex.test('price_1NirD0LkdIwH7ixAB123456'))
})
test('regex: rejects placeholder "price_professional_monthly"', () => {
  assert.ok(!regex.test('price_professional_monthly'))
})
test('regex: rejects empty string', () => {
  assert.ok(!regex.test(''))
})
test('regex: rejects non-price prefix', () => {
  assert.ok(!regex.test('prod_1MoBy5LkdIwHu7ixZhnattbh'))
})

// ── 4. Health route identity ─────────────────────────────────────────────────
const healthSrc = fs.readFileSync(
  path.join(DASHBOARD, 'app/api/health/route.ts'), 'utf8'
)
test('health: app identity "leadflow-dashboard" in response', () => {
  assert.ok(healthSrc.includes("app: 'leadflow-dashboard'"))
})

// ── 5. E2E skip logic ───────────────────────────────────────────────────────
const e2eSrc = fs.readFileSync(path.join(ROOT, 'scripts/e2e-flow-tests.sh'), 'utf8')
test('e2e: exit code 42 treated as skip', () => {
  assert.ok(e2eSrc.includes('exit_code" -eq 42'))
})
test('e2e: JSON output includes skipped count', () => {
  assert.ok(e2eSrc.includes('skipped'), 'missing skipped field in JSON output')
  assert.ok(e2eSrc.includes('SKIPPED'), 'missing SKIPPED variable in output line')
})

// ── 6. Migration 026 ────────────────────────────────────────────────────────
const migrationSrc = fs.readFileSync(
  path.join(ROOT, 'migrations/026_task_locks.sql'), 'utf8'
)
test('migration 026: task_locks table has composite PK', () => {
  assert.ok(migrationSrc.includes('PRIMARY KEY (task_title, agent_id)'))
})
test('migration 026: has expires_at index', () => {
  assert.ok(migrationSrc.includes('task_locks_expires_at_idx'))
})

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
