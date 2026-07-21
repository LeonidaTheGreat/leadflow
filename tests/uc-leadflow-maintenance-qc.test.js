'use strict'
const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0, failed = 0

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (e) { failed++; console.log(`  ✗ ${name}: ${e.message}`) }
}

const ROOT = path.join(__dirname, '..')
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard')

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8') }
function readDash(rel) { return fs.readFileSync(path.join(DASHBOARD, rel), 'utf8') }

// ── 1. Env var rename completeness in production source files ────────────────

console.log('\n[1] lib/config/index.js — Stripe env var rename')

const configSrc = read('lib/config/index.js')

test('uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_PRO_MONTHLY'), 'missing new PRO_MONTHLY var')
  assert.ok(!configSrc.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'stale PROFESSIONAL_MONTHLY')
})

test('uses STRIPE_PRICE_PRO_ANNUAL (not PROFESSIONAL_YEARLY)', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_PRO_ANNUAL'), 'missing new PRO_ANNUAL var')
  assert.ok(!configSrc.includes('STRIPE_PRICE_PROFESSIONAL_YEARLY'), 'stale PROFESSIONAL_YEARLY')
})

test('uses STRIPE_PRICE_TEAM_MONTHLY (not ENTERPRISE)', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'missing new TEAM_MONTHLY var')
  assert.ok(!configSrc.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'), 'stale ENTERPRISE_MONTHLY')
})

test('uses STRIPE_PRICE_TEAM_ANNUAL (not ENTERPRISE_YEARLY)', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_TEAM_ANNUAL'), 'missing new TEAM_ANNUAL var')
  assert.ok(!configSrc.includes('STRIPE_PRICE_ENTERPRISE_YEARLY'), 'stale ENTERPRISE_YEARLY')
})

test('uses STRIPE_PRICE_STARTER_ANNUAL (not YEARLY)', () => {
  assert.ok(configSrc.includes('STRIPE_PRICE_STARTER_ANNUAL'), 'missing new STARTER_ANNUAL var')
  assert.ok(!configSrc.includes('STRIPE_PRICE_STARTER_YEARLY'), 'stale STARTER_YEARLY')
})

// ── 2. BillingService diagnostic uses new names ──────────────────────────────

console.log('\n[2] BillingService.js — diagnostic env var names')

const billingSrc = read('lib/services/BillingService.js')

test('diagnostic checks STRIPE_PRICE_PRO_MONTHLY', () => {
  assert.ok(billingSrc.includes('STRIPE_PRICE_PRO_MONTHLY'), 'missing PRO_MONTHLY in diagnostic')
  assert.ok(!billingSrc.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'stale PROFESSIONAL_MONTHLY in diagnostic')
})

test('diagnostic checks STRIPE_PRICE_TEAM_MONTHLY', () => {
  assert.ok(billingSrc.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'missing TEAM_MONTHLY in diagnostic')
  assert.ok(!billingSrc.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'), 'stale ENTERPRISE_MONTHLY in diagnostic')
})

// ── 3. Dashboard routes use new env var names ────────────────────────────────

console.log('\n[3] Dashboard routes — env var rename')

const nudgeSrc = readDash('app/api/trial/nudge/route.ts')

test('trial/nudge uses STRIPE_PRICE_PRO_MONTHLY', () => {
  assert.ok(nudgeSrc.includes('STRIPE_PRICE_PRO_MONTHLY'), 'missing PRO_MONTHLY')
  assert.ok(!nudgeSrc.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'stale PROFESSIONAL_MONTHLY')
})

test('trial/nudge has no placeholder fallback', () => {
  assert.ok(!nudgeSrc.includes("'price_professional_monthly'"), 'placeholder fallback still present')
})

test('trial/nudge validates price ID with regex', () => {
  assert.ok(nudgeSrc.includes('/^price_[A-Za-z0-9]{14,36}$/'), 'missing Stripe price ID regex validation')
})

const paymentLinkSrc = readDash('app/api/admin/sales-cockpit/payment-link/route.ts')

test('payment-link uses STRIPE_PRICE_PRO_MONTHLY', () => {
  assert.ok(paymentLinkSrc.includes('STRIPE_PRICE_PRO_MONTHLY'), 'missing PRO_MONTHLY')
  assert.ok(!paymentLinkSrc.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'stale PROFESSIONAL_MONTHLY')
})

// ── 4. Health route identity field ───────────────────────────────────────────

console.log('\n[4] Health route — app identity')

const healthSrc = readDash('app/api/health/route.ts')

test('health route includes app identity field', () => {
  assert.ok(healthSrc.includes("app: 'leadflow-dashboard'"), 'missing app identity field')
})

// ── 5. Stripe price ID regex validation correctness ──────────────────────────

console.log('\n[5] Regex validation — Stripe price ID format')

const regex = /^price_[A-Za-z0-9]{14,36}$/

test('accepts real Stripe price IDs', () => {
  assert.ok(regex.test('price_1MoBy5LkdIwHu7ixZhnattbh'), 'should accept real Stripe ID')
  assert.ok(regex.test('price_1NqJo2LkdIwHu7ix'), 'should accept shorter valid ID')
})

test('rejects placeholder price IDs', () => {
  assert.ok(!regex.test('price_professional_monthly'), 'should reject placeholder')
  assert.ok(!regex.test('price_pro_149'), 'should reject short placeholder')
})

test('rejects empty and malformed IDs', () => {
  assert.ok(!regex.test(''), 'should reject empty')
  assert.ok(!regex.test('not_a_price_id'), 'should reject non-price prefix')
  assert.ok(!regex.test('price_'), 'should reject bare prefix')
})

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(50)}`)
console.log(`  Results: ${passed} passed, ${failed} failed`)
console.log(`${'═'.repeat(50)}`)
if (failed > 0) process.exit(1)
