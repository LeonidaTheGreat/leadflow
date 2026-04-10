/**
 * E2E Test: PR #1119 — BillingService refactor (fold billing-cycle-manager.js)
 * Use-case ID: 947cc91e-billing-cycle-manager-refactor
 *
 * Verifies:
 * 1. billing-cycle-manager.js is deleted (no stale file)
 * 2. No stale require() imports of billing-cycle-manager anywhere
 * 3. BillingService class defines all 7 methods from the old file (static analysis)
 * 4. Mock helpers are defined with _ prefix convention
 * 5. BillingService is imported by stripe-subscriptions/index.js
 * 6. No this.billingCycleManager delegation remains
 *
 * Note: Stripe package is a cloud-only dependency (not in node_modules).
 * Tests use static file analysis instead of runtime require().
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`       ${err.message}`);
    failed++;
  }
}

console.log('\n🧪 PR #1119: BillingService refactor (billing-cycle-manager fold)\n');

// ── Structural checks ────────────────────────────────────────────────────────

console.log('--- Structural checks ---');

test('billing-cycle-manager.js is deleted from lib/', () => {
  const oldFile = path.join(ROOT, 'lib', 'billing-cycle-manager.js');
  assert(!fs.existsSync(oldFile), `Old file still exists: ${oldFile}`);
});

const billingServiceContent = fs.readFileSync(path.join(ROOT, 'lib', 'services', 'BillingService.js'), 'utf8');

test('No require("billing-cycle-manager") in BillingService.js', () => {
  const requirePattern = /require\s*\(\s*['"].*billing-cycle-manager['"]\s*\)/;
  assert(!requirePattern.test(billingServiceContent), 'Stale require() found in BillingService.js');
});

test('No require("billing-cycle-manager") in stripe-subscriptions/index.js', () => {
  const content = fs.readFileSync(path.join(ROOT, 'stripe-subscriptions', 'index.js'), 'utf8');
  const requirePattern = /require\s*\(\s*['"].*billing-cycle-manager['"]\s*\)/;
  assert(!requirePattern.test(content), 'Stale require() found in stripe-subscriptions/index.js');
});

test('BillingService.js does not delegate via this.billingCycleManager', () => {
  assert(!billingServiceContent.includes('this.billingCycleManager'), 
    'this.billingCycleManager still referenced — delegation not removed');
});

test('BillingService constructor does not assign billingCycleManager', () => {
  assert(!billingServiceContent.includes('this.billingCycleManager ='), 
    'billingCycleManager still assigned in constructor');
});

// ── Method presence checks (static analysis) ─────────────────────────────────

console.log('\n--- Method presence checks (static analysis) ---');

const expectedMethods = [
  'getBillingCycleInfo',
  'calculateProration',
  'previewBillingCycleChange',
  'updateBillingCycle',
  'getRenewalHistory',
  'getUpcomingRenewals',
  'syncBillingCycles'
];

for (const method of expectedMethods) {
  test(`BillingService defines method: ${method}`, () => {
    // Look for async method definition pattern: "async METHOD(" or "METHOD("
    const asyncPattern = new RegExp(`async\\s+${method}\\s*\\(`);
    const syncPattern = new RegExp(`\\s${method}\\s*\\(`);
    assert(asyncPattern.test(billingServiceContent) || syncPattern.test(billingServiceContent),
      `Method ${method} not found in BillingService.js`);
  });
}

// ── Mock helper checks ────────────────────────────────────────────────────────

console.log('\n--- Mock helper checks ---');

const mockHelpers = [
  '_mockBillingCycleInfo',
  '_mockProrationCalculation',
  '_mockBillingCyclePreview'
];

for (const helper of mockHelpers) {
  test(`Mock helper defined: ${helper}`, () => {
    assert(billingServiceContent.includes(helper),
      `Mock helper ${helper} not found in BillingService.js`);
  });
}

// ── Consumer wiring checks ────────────────────────────────────────────────────

console.log('\n--- Consumer wiring ---');

test('stripe-subscriptions/index.js imports BillingService', () => {
  const content = fs.readFileSync(path.join(ROOT, 'stripe-subscriptions', 'index.js'), 'utf8');
  assert(content.includes("require('../lib/services/BillingService')"),
    'BillingService not imported by stripe-subscriptions/index.js');
});

test('routes/billing.js exists (BillingService has a consumer in routes)', () => {
  const billingRoute = path.join(ROOT, 'routes', 'billing.js');
  assert(fs.existsSync(billingRoute), 'routes/billing.js should exist');
});

test('routes/billing.js references BillingService', () => {
  const content = fs.readFileSync(path.join(ROOT, 'routes', 'billing.js'), 'utf8');
  assert(content.includes('BillingService') || content.includes('billing-service') || content.includes('billingService'),
    'routes/billing.js does not reference BillingService');
});

// ── Logic integrity checks ───────────────────────────────────────────────────

console.log('\n--- Logic integrity ---');

test('getBillingCycleInfo uses this.stripe (not module-level stripe)', () => {
  // The old code used module-level `stripe` variable, new code uses `this.stripe`
  // Check that getBillingCycleInfo block uses this.stripe
  const methodStart = billingServiceContent.indexOf('async getBillingCycleInfo(');
  const methodEnd = billingServiceContent.indexOf('\n  async ', methodStart + 1);
  const methodBody = billingServiceContent.slice(methodStart, methodEnd > 0 ? methodEnd : methodStart + 2000);
  assert(methodBody.includes('this.stripe'), 'getBillingCycleInfo should use this.stripe, not module-level stripe');
});

test('syncBillingCycles uses this.db (not module-level supabase)', () => {
  const methodStart = billingServiceContent.indexOf('async syncBillingCycles(');
  const methodEnd = billingServiceContent.indexOf('\n  async ', methodStart + 1);
  const methodBody = billingServiceContent.slice(methodStart, methodEnd > 0 ? methodEnd : methodStart + 3000);
  assert(methodBody.includes('this.db'), 'syncBillingCycles should use this.db, not module-level supabase');
});

test('previewBillingCycleChange uses this.getPriceId (not inline TIER_PRICES map)', () => {
  const methodStart = billingServiceContent.indexOf('async previewBillingCycleChange(');
  const methodEnd = billingServiceContent.indexOf('\n  async ', methodStart + 1);
  const methodBody = billingServiceContent.slice(methodStart, methodEnd > 0 ? methodEnd : methodStart + 2000);
  // Old code had inline TIER_PRICES map; new code should use this.getPriceId()
  assert(!methodBody.includes('TIER_PRICES'), 'previewBillingCycleChange should use this.getPriceId(), not inline TIER_PRICES map');
  assert(methodBody.includes('this.getPriceId') || methodBody.includes('getPriceId'), 
    'previewBillingCycleChange should use getPriceId()');
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n============================================================');
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
