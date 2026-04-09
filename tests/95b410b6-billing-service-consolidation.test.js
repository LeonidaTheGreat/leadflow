/**
 * QC E2E Test: 95b410b6 — Billing consolidation into BillingService class
 * Verifies:
 * 1. Old lib/billing.js and lib/billing-enhanced.js are removed
 * 2. routes/billing-enhanced.js is removed
 * 3. lib/services/BillingService.js exists and exports a class
 * 4. BillingService constructor supports dependency injection
 * 5. routes/billing.js delegates to BillingService (no direct Stripe/DB calls)
 * 6. stripe-subscriptions/index.js points to new BillingService
 * 7. Core BillingService methods work with mock Stripe
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/Users/clawdbot/projects/leadflow';

let passed = 0;
let failed = 0;

function pass(name) { console.log(`PASS: ${name}`); passed++; }
function fail(name, reason) { console.error(`FAIL: ${name} — ${reason}`); failed++; }

// ─── Static file checks ───────────────────────────────────────────────────────

// Test 1: lib/billing.js is removed
try {
  const filePath = path.join(PROJECT_DIR, 'lib/billing.js');
  assert.ok(!fs.existsSync(filePath), 'lib/billing.js should be deleted');
  pass('lib/billing.js removed');
} catch (e) {
  fail('lib/billing.js removed', e.message);
}

// Test 2: lib/billing-enhanced.js is removed
try {
  const filePath = path.join(PROJECT_DIR, 'lib/billing-enhanced.js');
  assert.ok(!fs.existsSync(filePath), 'lib/billing-enhanced.js should be deleted');
  pass('lib/billing-enhanced.js removed');
} catch (e) {
  fail('lib/billing-enhanced.js removed', e.message);
}

// Test 3: routes/billing-enhanced.js is removed
try {
  const filePath = path.join(PROJECT_DIR, 'routes/billing-enhanced.js');
  assert.ok(!fs.existsSync(filePath), 'routes/billing-enhanced.js should be deleted');
  pass('routes/billing-enhanced.js removed');
} catch (e) {
  fail('routes/billing-enhanced.js removed', e.message);
}

// Test 4: lib/services/BillingService.js exists
try {
  const filePath = path.join(PROJECT_DIR, 'lib/services/BillingService.js');
  assert.ok(fs.existsSync(filePath), 'lib/services/BillingService.js should exist');
  pass('lib/services/BillingService.js exists');
} catch (e) {
  fail('lib/services/BillingService.js exists', e.message);
}

// Test 5: routes/billing.js does not contain direct Stripe or DB calls
try {
  const content = fs.readFileSync(path.join(PROJECT_DIR, 'routes/billing.js'), 'utf8');
  // Route must not instantiate Stripe directly
  assert.ok(!content.includes('new Stripe('), 'routes/billing.js must not instantiate Stripe');
  // Route must not call stripe.subscriptions, stripe.customers directly
  assert.ok(!/stripe\.(subscriptions|customers|paymentMethods|webhooks)\./g.test(content),
    'routes/billing.js must not call Stripe API directly');
  // Must import BillingService
  assert.ok(content.includes('BillingService'), 'routes/billing.js must import BillingService');
  pass('routes/billing.js is thin (no direct Stripe calls)');
} catch (e) {
  fail('routes/billing.js is thin (no direct Stripe calls)', e.message);
}

// Test 6: No remaining imports of old billing files from routes or server
try {
  const filesToCheck = [
    path.join(PROJECT_DIR, 'server.js'),
    path.join(PROJECT_DIR, 'routes/billing.js'),
    path.join(PROJECT_DIR, 'stripe-subscriptions/index.js'),
  ];
  for (const f of filesToCheck) {
    if (!fs.existsSync(f)) continue;
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!content.includes("require('./billing')") && !content.includes("require('../lib/billing')") &&
      !content.includes("require('./lib/billing')"),
      `${path.basename(f)} should not import old lib/billing.js`
    );
    assert.ok(!content.includes('billing-enhanced'),
      `${path.basename(f)} should not import billing-enhanced`
    );
  }
  pass('No stale imports of old billing files in routes/server');
} catch (e) {
  fail('No stale imports of old billing files in routes/server', e.message);
}

// Test 7: stripe-subscriptions/index.js exports reference BillingService
try {
  const content = fs.readFileSync(path.join(PROJECT_DIR, 'stripe-subscriptions/index.js'), 'utf8');
  assert.ok(content.includes('BillingService'), 'stripe-subscriptions/index.js must reference BillingService');
  assert.ok(!content.includes('billing-enhanced'), 'stripe-subscriptions/index.js must not reference billing-enhanced');
  pass('stripe-subscriptions/index.js uses BillingService');
} catch (e) {
  fail('stripe-subscriptions/index.js uses BillingService', e.message);
}

// ─── Functional tests with mock Stripe ────────────────────────────────────────

(async () => {
  // Load BillingService source directly (bypass stripe require at module level)
  let BillingService;
  try {
    // We need to mock stripe before requiring BillingService
    // BillingService accepts stripe via constructor injection — test with null stripe (no-key mode)
    // This simulates the mock path already tested in BillingService itself
    const src = fs.readFileSync(path.join(PROJECT_DIR, 'lib/services/BillingService.js'), 'utf8');

    // Test 8: BillingService source exposes a class and exports instance + class
    assert.ok(src.includes('class BillingService'), 'BillingService.js must define class BillingService');
    assert.ok(src.includes('module.exports = new BillingService()'), 'must export singleton instance');
    assert.ok(src.includes('module.exports.BillingService = BillingService'), 'must also export the class for DI');
    pass('BillingService.js exports both singleton and class');
  } catch (e) {
    fail('BillingService.js exports both singleton and class', e.message);
  }

  // Test 9: BillingService mock-mode methods work (no Stripe, no DB)
  try {
    // Require with mocked stripe module — use Node module cache trick
    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function(request, parent, isMain) {
      if (request === 'stripe') {
        return class MockStripe {};
      }
      return originalLoad.apply(this, arguments);
    };

    // Clear require cache for BillingService and its deps that use stripe
    const billingPath = require.resolve(path.join(PROJECT_DIR, 'lib/services/BillingService.js'));
    delete require.cache[billingPath];
    // Also clear deps that load stripe at module level
    ['lib/billing-cycle-manager.js', 'lib/subscription-service.js',
     'lib/webhook-processor.js', 'lib/stripe-portal.js'].forEach(dep => {
      try {
        const p = require.resolve(path.join(PROJECT_DIR, dep));
        delete require.cache[p];
      } catch(_) {}
    });

    const { BillingService: BS } = require(billingPath);
    const svc = new BS({ stripe: null, db: null }); // no-stripe mode

    // createCustomer returns mock
    const customer = await svc.createCustomer({ id: 'agent-123', email: 'test@example.com' });
    assert.ok(customer.mock === true, 'createCustomer should return mock when stripe is null');
    assert.ok(customer.id.startsWith('mock_customer_'), 'mock customer id should have correct prefix');
    pass('createCustomer returns mock when Stripe not configured');

    // createSubscription returns mock
    const sub = await svc.createSubscription('cus_mock', undefined);
    assert.ok(sub.mock === true, 'createSubscription should return mock');
    assert.ok(sub.status === 'active', 'mock subscription should have active status');
    pass('createSubscription returns mock when Stripe not configured');

    // createSetupIntent returns mock
    const intent = await svc.createSetupIntent('cus_mock');
    assert.ok(intent.mock === true, 'createSetupIntent should return mock');
    assert.ok(typeof intent.client_secret === 'string', 'mock intent must have client_secret');
    pass('createSetupIntent returns mock when Stripe not configured');

    // cancelSubscription returns mock
    const cancel = await svc.cancelSubscription('mock_sub_123');
    assert.ok(cancel.mock === true, 'cancelSubscription should return mock');
    pass('cancelSubscription returns mock when Stripe not configured');

    // getPriceId returns env-mapped value or undefined
    const priceId = svc.getPriceId('starter', 'month');
    // Should be undefined (no env set) or a string — just check no exception
    assert.ok(priceId === undefined || typeof priceId === 'string', 'getPriceId must return string or undefined');
    pass('getPriceId resolves without error');

    // calculateMRR: monthly
    const mrr1 = svc.calculateMRR({ metadata: { amount: 149 }, interval: 'month' });
    assert.strictEqual(mrr1, 149, 'monthly MRR should equal plan amount');
    // calculateMRR: yearly (divide by 12)
    const mrr2 = svc.calculateMRR({ metadata: { amount: 1200 }, interval: 'year' });
    assert.strictEqual(mrr2, 100, 'yearly MRR should be divided by 12');
    pass('calculateMRR computes correctly for monthly and yearly');

    Module._load = originalLoad; // restore
  } catch (e) {
    fail('BillingService mock-mode functional tests', e.message);
  }

  // Test 10: verifyWebhookSignature throws when not configured
  try {
    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function(request, parent, isMain) {
      if (request === 'stripe') return class MockStripe {};
      return originalLoad.apply(this, arguments);
    };

    const billingPath = require.resolve(path.join(PROJECT_DIR, 'lib/services/BillingService.js'));
    delete require.cache[billingPath];
    const { BillingService: BS } = require(billingPath);
    const svc = new BS({ stripe: null });

    let threw = false;
    try {
      svc.verifyWebhookSignature('payload', 'sig');
    } catch (_) {
      threw = true;
    }
    assert.ok(threw, 'verifyWebhookSignature must throw when not configured');
    pass('verifyWebhookSignature throws when Stripe not configured');

    Module._load = originalLoad;
  } catch (e) {
    fail('verifyWebhookSignature throws when not configured', e.message);
  }

  // Summary
  const total = passed + failed;
  console.log(`\n--- Results: ${passed}/${total} passed ---`);
  if (failed > 0) process.exit(1);
})();
