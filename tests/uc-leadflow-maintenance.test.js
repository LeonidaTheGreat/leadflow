'use strict'
/**
 * Regression guard: PR #2144 — fix-retry-zero-conversions-no-paying-cus
 *
 * Verifies:
 * 1. Stripe env var rename complete in lib/config and lib/services
 * 2. nudge route: no hardcoded fallback, regex guard instead of string prefix
 * 3. e2e-flow-tests.sh: skip (exit 42) path and skipped counter exist
 * 4. health route: app identity field present
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard')

let passed = 0; let failed = 0

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++ }
  catch (err) { console.log(`  ❌ ${name}: ${err.message}`); failed++ }
}

// ── 1. lib/config/index.js uses canonical env var names ──────────────────────
test('lib/config uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/config/index.js'), 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'STRIPE_PRICE_PRO_MONTHLY missing')
  assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'stale STRIPE_PRICE_PROFESSIONAL_MONTHLY present')
})

test('lib/config uses STRIPE_PRICE_TEAM_MONTHLY (not ENTERPRISE)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/config/index.js'), 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'STRIPE_PRICE_TEAM_MONTHLY missing')
  assert.ok(!src.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'), 'stale STRIPE_PRICE_ENTERPRISE_MONTHLY present')
})

test('lib/config uses STRIPE_PRICE_STARTER_ANNUAL (not YEARLY)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/config/index.js'), 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_STARTER_ANNUAL'), 'STRIPE_PRICE_STARTER_ANNUAL missing')
  assert.ok(!src.includes('STRIPE_PRICE_STARTER_YEARLY'), 'stale STRIPE_PRICE_STARTER_YEARLY present')
})

// ── 2. BillingService diagnostic uses new names ───────────────────────────────
test('BillingService diagnostic uses STRIPE_PRICE_PRO_MONTHLY', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/services/BillingService.js'), 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'STRIPE_PRICE_PRO_MONTHLY missing from diagnostic')
  assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'stale PROFESSIONAL name in diagnostic')
})

// ── 3. nudge route: no hardcoded fallback, regex guard ───────────────────────
test('nudge route uses STRIPE_PRICE_PRO_MONTHLY', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/trial/nudge/route.ts'), 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'new env var not found in nudge route')
  assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'stale env var still present')
})

test('nudge route has no hardcoded price_professional fallback', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/trial/nudge/route.ts'), 'utf8')
  assert.ok(!src.includes("'price_professional_monthly'"), 'hardcoded fallback string still present')
  assert.ok(!src.includes('"price_professional_monthly"'), 'hardcoded fallback string still present')
})

test('nudge route uses regex guard instead of string prefix check', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/trial/nudge/route.ts'), 'utf8')
  assert.ok(src.includes('/^price_[A-Za-z0-9]'), 'regex guard missing')
  assert.ok(!src.includes("startsWith('price_professional')"), 'old string prefix check still present')
})

// ── 4. payment-link admin route uses new name ─────────────────────────────────
test('payment-link route uses STRIPE_PRICE_PRO_MONTHLY', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/sales-cockpit/payment-link/route.ts'), 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'new env var missing from payment-link route')
  assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'stale env var in payment-link route')
})

// ── 5. health route has deployment identity field ────────────────────────────
test('health route includes app identity field', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/health/route.ts'), 'utf8')
  assert.ok(src.includes("app: 'leadflow-dashboard'"), "identity field 'app: leadflow-dashboard' missing")
})

// ── 6. e2e-flow-tests.sh: skip (exit 42) logic present ──────────────────────
test('e2e-flow-tests.sh has skip exit code 42 for no-users precondition', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/e2e-flow-tests.sh'), 'utf8')
  assert.ok(src.includes('"$exit_code" -eq 42'), 'skip (exit 42) handler missing')
  assert.ok(src.includes('SKIPPED=$((SKIPPED + 1))'), 'SKIPPED counter missing')
  assert.ok(src.includes('return 42'), 'return 42 not used in no-user guard')
})

test('e2e-flow-tests.sh skipped count is included in JSON output', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/e2e-flow-tests.sh'), 'utf8')
  assert.ok(src.includes('\\\"skipped\\\":$SKIPPED'), 'skipped field missing from JSON output')
})

// ── 7. Migration 026 task_locks table ────────────────────────────────────────
test('migration 026 task_locks table exists with correct structure', () => {
  const src = fs.readFileSync(path.join(ROOT, 'migrations/026_task_locks.sql'), 'utf8')
  assert.ok(src.includes('CREATE TABLE IF NOT EXISTS task_locks'), 'table definition missing')
  assert.ok(src.includes('PRIMARY KEY (task_title, agent_id)'), 'compound PK missing')
  assert.ok(src.includes('expires_at'), 'TTL column missing')
})

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
