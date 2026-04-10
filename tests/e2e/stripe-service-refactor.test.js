/**
 * E2E Test: PR #1117 — StripeService refactor
 * Verifies the new StripeService class is functionally equivalent to the deleted stripe-portal.js
 * Uses module mocking to handle environments where 'stripe' npm package is not installed locally.
 */

'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Mock the 'stripe' module before requiring StripeService
// This allows testing in environments where 'stripe' npm package is not installed
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'stripe') {
    // Return a mock Stripe constructor
    return function MockStripe(key) {
      this.billingPortal = {
        configurations: {
          list: async () => ({ data: [] }),
          create: async () => ({ id: 'bpc_test_123' }),
          update: async () => ({ id: 'bpc_test_123' })
        },
        sessions: {
          create: async () => ({ url: 'https://billing.stripe.com/session/test', id: 'bps_test', customer: 'cus_test' })
        }
      };
      this.subscriptions = { list: async () => ({ data: [] }) };
      this.invoices = { list: async () => ({ data: [], has_more: false }) };
      this.paymentMethods = { list: async () => ({ data: [] }) };
      this.customers = { retrieve: async () => ({ invoice_settings: { default_payment_method: null } }) };
    };
  }
  return originalLoad.apply(this, arguments);
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✅ PASS: ' + name);
    passed++;
  } catch (err) {
    console.error('❌ FAIL: ' + name);
    console.error('   ' + err.message);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log('✅ PASS: ' + name);
    passed++;
  } catch (err) {
    console.error('❌ FAIL: ' + name);
    console.error('   ' + err.message);
    failed++;
  }
}

async function main() {
  // --- Test 1: Old file is gone ---
  test('Old stripe-portal.js is deleted', () => {
    const oldPath = path.join(__dirname, '../../lib/stripe-portal.js');
    assert(!fs.existsSync(oldPath), 'Expected lib/stripe-portal.js to not exist');
  });

  // --- Test 2: New StripeService file exists ---
  test('New StripeService.js exists at lib/services/StripeService.js', () => {
    const newPath = path.join(__dirname, '../../lib/services/StripeService.js');
    assert(fs.existsSync(newPath), 'Expected lib/services/StripeService.js to exist');
  });

  // --- Test 3: StripeService can be required without errors ---
  test('StripeService can be required (module loads)', () => {
    const stripeService = require(path.join(__dirname, '../../lib/services/StripeService'));
    assert(stripeService !== null && stripeService !== undefined, 'StripeService should not be null');
  });

  // --- Test 4: Singleton export has all expected methods ---
  test('Singleton export has all methods used by BillingService', () => {
    const stripeService = require(path.join(__dirname, '../../lib/services/StripeService'));
    const requiredMethods = [
      'configurePortal',
      'createPortalSession',
      'getPortalConfig',
      'getCustomerSubscriptions',
      'getCustomerInvoices',
      'getCustomerPaymentMethods',
      'updatePortalBranding',
      'getSubscriptionManagementConfig',
      'getPaymentMethodConfig',
      'getInvoiceHistoryConfig'
    ];
    for (const method of requiredMethods) {
      assert(typeof stripeService[method] === 'function', 'Expected stripeService.' + method + ' to be a function');
    }
  });

  // --- Test 5: Class export is accessible ---
  test('StripeService class export is accessible via module.exports.StripeService', () => {
    const mod = require(path.join(__dirname, '../../lib/services/StripeService'));
    const StripeService = mod.StripeService;
    assert(typeof StripeService === 'function', 'StripeService class should be exported');
    const instance = new StripeService({ stripe: null });
    assert(instance instanceof StripeService, 'Should be able to instantiate StripeService');
  });

  // --- Test 6: BillingService imports StripeService not stripe-portal ---
  test('BillingService requires StripeService (not stripe-portal)', () => {
    const content = fs.readFileSync(path.join(__dirname, '../../lib/services/BillingService.js'), 'utf8');
    assert(content.includes('./StripeService'), 'BillingService should import ./StripeService');
    assert(!content.includes('stripe-portal'), 'BillingService should not reference stripe-portal');
  });

  // --- Test 7: stripe-subscriptions/index.js uses StripeService ---
  test('stripe-subscriptions/index.js requires StripeService (not stripe-portal)', () => {
    const content = fs.readFileSync(path.join(__dirname, '../../stripe-subscriptions/index.js'), 'utf8');
    assert(content.includes('lib/services/StripeService'), 'stripe-subscriptions/index.js should import StripeService');
    assert(!content.includes('stripe-portal'), 'stripe-subscriptions/index.js should not reference stripe-portal');
  });

  // --- Test 8: getPortalConfig returns expected structure ---
  test('getPortalConfig returns object with branding, business, features, returnUrl', () => {
    const stripeService = require(path.join(__dirname, '../../lib/services/StripeService'));
    const config = stripeService.getPortalConfig();
    assert(typeof config === 'object', 'getPortalConfig should return object');
    assert(typeof config.branding === 'object', 'config.branding should be object');
    assert(typeof config.business === 'object', 'config.business should be object');
    assert(typeof config.features === 'object', 'config.features should be object');
    assert(typeof config.returnUrl === 'string', 'config.returnUrl should be string');
  });

  // --- Test 9: createPortalSession throws on missing customerId ---
  await testAsync('createPortalSession throws when customerId is missing', async () => {
    const stripeService = require(path.join(__dirname, '../../lib/services/StripeService'));
    try {
      await stripeService.createPortalSession(null);
      assert.fail('Expected error to be thrown');
    } catch (err) {
      if (err.message === 'Expected error to be thrown') throw err;
      assert(err.message.includes('Customer ID is required'), 'Got unexpected error: ' + err.message);
    }
  });

  // --- Test 10: No stale stripe-portal references in lib/ or routes/ ---
  test('No stale stripe-portal references in lib/ or routes/ or server.js', () => {
    const result = execSync(
      'grep -r "stripe-portal" /Users/clawdbot/projects/leadflow/routes/ /Users/clawdbot/projects/leadflow/lib/ /Users/clawdbot/projects/leadflow/server.js 2>/dev/null || true'
    ).toString().trim();
    assert(result === '', 'Found stale references:\n' + result);
  });

  // --- Test 11: configurePortal returns mock when Stripe not configured ---
  await testAsync('configurePortal returns mock config when Stripe not configured', async () => {
    const mod = require(path.join(__dirname, '../../lib/services/StripeService'));
    const svc = new mod.StripeService({ stripe: null });
    const result = await svc.configurePortal();
    assert(result.mock === true, 'Should return mock: true when Stripe not configured');
    assert(typeof result.config === 'object', 'Should return config object in mock mode');
  });

  // --- Test 12: configurePortal creates portal config when Stripe is configured ---
  await testAsync('configurePortal creates portal config when Stripe is configured (mock Stripe)', async () => {
    const mod = require(path.join(__dirname, '../../lib/services/StripeService'));
    // Pass a mock Stripe client that simulates no existing config
    const mockStripe = {
      billingPortal: {
        configurations: {
          list: async () => ({ data: [] }),
          create: async (cfg) => ({ id: 'bpc_test_new' })
        }
      }
    };
    const svc = new mod.StripeService({ stripe: mockStripe });
    const result = await svc.configurePortal();
    assert(result.success === true, 'Should return success: true');
    assert(result.configurationId === 'bpc_test_new', 'Should return the new configuration ID');
  });

  // --- Test 13: createPortalSession returns session URL ---
  await testAsync('createPortalSession returns session URL with mock Stripe', async () => {
    const mod = require(path.join(__dirname, '../../lib/services/StripeService'));
    const mockStripe = {
      billingPortal: {
        sessions: {
          create: async () => ({ url: 'https://billing.stripe.com/test', id: 'bps_test', customer: 'cus_123' })
        }
      }
    };
    const svc = new mod.StripeService({ stripe: mockStripe });
    const result = await svc.createPortalSession('cus_123', { returnUrl: 'https://leadflow.ai/dashboard' });
    assert(result.success === true, 'Should return success: true');
    assert(typeof result.url === 'string', 'Should return a URL');
    assert(result.url.includes('billing.stripe.com'), 'URL should be from Stripe billing portal');
  });

  // --- Test 14: getCustomerSubscriptions returns mock for mock_ customers ---
  await testAsync('getCustomerSubscriptions returns mock for mock_ customer IDs', async () => {
    const mod = require(path.join(__dirname, '../../lib/services/StripeService'));
    const svc = new mod.StripeService({ stripe: null });
    const result = await svc.getCustomerSubscriptions('mock_cus_123');
    assert(result.mock === true, 'Should return mock: true for mock customers');
    assert(Array.isArray(result.subscriptions), 'Should have subscriptions array');
    assert(result.subscriptions.length > 0, 'Mock subscriptions should be non-empty');
  });

  // --- Test 15: getCustomerInvoices returns mock for mock_ customers ---
  await testAsync('getCustomerInvoices returns mock for mock_ customer IDs', async () => {
    const mod = require(path.join(__dirname, '../../lib/services/StripeService'));
    const svc = new mod.StripeService({ stripe: null });
    const result = await svc.getCustomerInvoices('mock_cus_123');
    assert(result.mock === true, 'Should return mock: true for mock customers');
    assert(Array.isArray(result.invoices), 'Should have invoices array');
  });

  // --- Test 16: getCustomerPaymentMethods returns mock for mock_ customers ---
  await testAsync('getCustomerPaymentMethods returns mock for mock_ customer IDs', async () => {
    const mod = require(path.join(__dirname, '../../lib/services/StripeService'));
    const svc = new mod.StripeService({ stripe: null });
    const result = await svc.getCustomerPaymentMethods('mock_cus_123');
    assert(result.mock === true, 'Should return mock: true for mock customers');
    assert(Array.isArray(result.paymentMethods), 'Should have paymentMethods array');
  });

  console.log('\n============================================================');
  console.log('PR #1117 StripeService Refactor — E2E Test Results');
  console.log('============================================================');
  console.log('Passed: ' + passed);
  console.log('Failed: ' + failed);
  console.log('Success Rate: ' + Math.round((passed / (passed + failed)) * 100) + '%');
  console.log('============================================================');

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
