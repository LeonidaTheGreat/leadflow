/**
 * E2E test: Billing consolidation refactor (UC 95b410b6)
 *
 * Verifies:
 * 1. Old billing files are deleted (billing.js, billing-enhanced.js, routes/billing-enhanced.js)
 * 2. lib/services/BillingService.js exists and has expected API surface
 * 3. routes/billing.js imports from lib/services/BillingService (not lib/billing)
 * 4. stripe-subscriptions/index.js delegates to BillingService
 * 5. lib/pg-pool.js exists and exports getPool
 * 6. pg-pool is used by stuck-pilots-service, funnel-diagnostics, activation-outreach
 * 7. No duplicate getPool() implementations in those files
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const results = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    results.push({ name, ok: true });
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    results.push({ name, ok: false, error: err.message });
    failed++;
  }
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function fileContent(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

console.log('\n=== Billing Consolidation Refactor (95b410b6) ===\n');

// ── Deletion checks ────────────────────────────────────────────────────────
console.log('1. Deleted files');

test('lib/billing.js is deleted', () => {
  assert.strictEqual(fileExists('lib/billing.js'), false, 'lib/billing.js still exists');
});

test('lib/billing-enhanced.js is deleted', () => {
  assert.strictEqual(fileExists('lib/billing-enhanced.js'), false, 'lib/billing-enhanced.js still exists');
});

test('routes/billing-enhanced.js is deleted', () => {
  assert.strictEqual(fileExists('routes/billing-enhanced.js'), false, 'routes/billing-enhanced.js still exists');
});

// ── New BillingService ────────────────────────────────────────────────────
console.log('\n2. lib/services/BillingService.js');

test('BillingService.js exists', () => {
  assert.ok(fileExists('lib/services/BillingService.js'), 'BillingService.js not found');
});

test('BillingService.js exports a class instance', () => {
  const content = fileContent('lib/services/BillingService.js');
  assert.ok(/class BillingService/.test(content), 'No class declaration found');
  assert.ok(/module\.exports\s*=\s*new BillingService/.test(content), 'No singleton export');
});

test('BillingService has expected methods', () => {
  const content = fileContent('lib/services/BillingService.js');
  const expectedMethods = [
    'createCustomer',
    'createSubscription',
    'createSetupIntent',
    'getSubscriptionStatus',
    'cancelSubscription',
    'createPortalSession',
    'handleWebhook',
    'verifyWebhookSignature',
  ];
  for (const method of expectedMethods) {
    assert.ok(new RegExp(`async ${method}|${method}\\(`).test(content), `Method ${method} not found`);
  }
});

test('BillingService uses constructor injection (no module-level stripe singleton)', () => {
  const content = fileContent('lib/services/BillingService.js');
  // Stripe is created inside constructor, not at module level
  assert.ok(/constructor\(/.test(content), 'No constructor found');
  assert.ok(/this\.stripe/.test(content), 'Stripe not injected via this.stripe');
  // Old pattern was: const stripe = new Stripe(...) at module level
  const moduleLevel = content.indexOf('class BillingService');
  const stripeInit = content.indexOf('new Stripe(');
  // stripeInit should be INSIDE the class (after class declaration)
  assert.ok(stripeInit > moduleLevel, 'Stripe initialized at module level, not in constructor');
});

// ── routes/billing.js ─────────────────────────────────────────────────────
console.log('\n3. routes/billing.js');

test('routes/billing.js exists', () => {
  assert.ok(fileExists('routes/billing.js'), 'routes/billing.js not found');
});

test('routes/billing.js imports from lib/services/BillingService', () => {
  const content = fileContent('routes/billing.js');
  assert.ok(
    /require\(['"]\.\.\/lib\/services\/BillingService['"]\)/.test(content),
    'Does not import from lib/services/BillingService'
  );
});

test('routes/billing.js does NOT import from old lib/billing', () => {
  const content = fileContent('routes/billing.js');
  assert.ok(
    !/require\(['"]\.\.\/lib\/billing['"]\)/.test(content),
    'Still imports from old lib/billing'
  );
});

test('routes/billing.js has no DB queries (routes must be thin)', () => {
  const content = fileContent('routes/billing.js');
  // No direct pool/db queries in routes
  assert.ok(!/getPool\(\)/.test(content), 'Route has direct DB pool access');
  assert.ok(!/\.query\(/.test(content), 'Route has direct DB query');
  assert.ok(!/\.from\(/.test(content), 'Route has direct DB .from() call');
});

// ── stripe-subscriptions/index.js ────────────────────────────────────────
console.log('\n4. stripe-subscriptions/index.js');

test('stripe-subscriptions/index.js imports BillingService', () => {
  const content = fileContent('stripe-subscriptions/index.js');
  assert.ok(
    /require\(['"]\.\.\/lib\/services\/BillingService['"]\)/.test(content),
    'stripe-subscriptions/index.js does not use BillingService'
  );
});

test('stripe-subscriptions/index.js does NOT import old billing modules', () => {
  const content = fileContent('stripe-subscriptions/index.js');
  assert.ok(
    !/require\(['"]\.\.\/lib\/billing['"]\)/.test(content),
    'Still imports old lib/billing'
  );
  assert.ok(
    !/require\(['"]\.\.\/lib\/billing-enhanced['"]\)/.test(content),
    'Still imports old lib/billing-enhanced'
  );
});

// ── lib/pg-pool.js ───────────────────────────────────────────────────────
console.log('\n5. lib/pg-pool.js');

test('lib/pg-pool.js exists', () => {
  assert.ok(fileExists('lib/pg-pool.js'), 'lib/pg-pool.js not found');
});

test('lib/pg-pool.js exports getPool', () => {
  const content = fileContent('lib/pg-pool.js');
  assert.ok(/function getPool/.test(content), 'getPool function not found');
  assert.ok(/module\.exports\s*=\s*\{[^}]*getPool/.test(content), 'getPool not exported');
});

test('lib/pg-pool.js uses LOCAL_PG_URL env var', () => {
  const content = fileContent('lib/pg-pool.js');
  assert.ok(/LOCAL_PG_URL/.test(content), 'Does not use LOCAL_PG_URL');
});

test('lib/pg-pool.js is a singleton (lazy init)', () => {
  const content = fileContent('lib/pg-pool.js');
  assert.ok(/let _pool\s*=\s*null|let pool\s*=\s*null/.test(content), 'No null-initialized singleton pattern');
});

// ── DB pool consolidation ────────────────────────────────────────────────
console.log('\n6. DB pool consolidation in service files');

const poolUsers = [
  'lib/stuck-pilots-service.js',
  'routes/admin/funnel-diagnostics.js',
  'routes/admin/activation-outreach.js',
];

for (const rel of poolUsers) {
  test(`${rel} uses shared pg-pool`, () => {
    const content = fileContent(rel);
    assert.ok(
      /require\(.*pg-pool['"]/.test(content),
      `${rel} does not require pg-pool`
    );
  });

  test(`${rel} has no inline getPool() implementation`, () => {
    const content = fileContent(rel);
    // Should not define its own Pool or getPool
    assert.ok(
      !/new Pool\(/.test(content),
      `${rel} still has inline Pool instantiation`
    );
    assert.ok(
      !/function getPool/.test(content),
      `${rel} still has inline getPool() definition`
    );
  });
}

// ── Summary ──────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  console.log('FAILED tests:');
  results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  process.exit(1);
}
