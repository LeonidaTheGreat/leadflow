'use strict';

/**
 * E2E test: FUB integration to FUBService class refactor (UC b08ab949)
 *
 * Verifies:
 * 1. integrations/fub-webhook-listener.js re-exports correctly (backward compat)
 * 2. FUBService exposes correct interface (router, fubEventBus, verifyFubWebhookSignature)
 * 3. Webhook payload handling emits events and returns expected response
 * 4. All billing routes delegate to BillingService (no inline implementations in routes)
 * 5. BillingService exports a singleton with all required methods
 */

const assert = require('assert');
const { EventEmitter } = require('events');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ❌ ${name}: ${err.message}`);
  }
}

async function runTests() {
  console.log('\n🧪 FUB service refactor E2E (UC b08ab949)\n');

  // 1. Backward compat: integrations/fub-webhook-listener.js re-export
  await test('integrations/fub-webhook-listener re-exports router, fubEventBus, verifyFubWebhookSignature', () => {
    const legacy = require('../../integrations/fub-webhook-listener');
    assert.ok(legacy.router, 'router must be exported');
    assert.ok(legacy.fubEventBus instanceof EventEmitter, 'fubEventBus must be an EventEmitter');
    assert.strictEqual(typeof legacy.verifyFubWebhookSignature, 'function', 'verifyFubWebhookSignature must be a function');
  });

  // 2. New integration/fub-webhook-listener.js exposes same interface
  await test('integration/fub-webhook-listener (new) exports router, fubEventBus, verifyFubWebhookSignature', () => {
    const newListener = require('../../integration/fub-webhook-listener');
    assert.ok(newListener.router, 'router must be exported');
    assert.ok(newListener.fubEventBus instanceof EventEmitter, 'fubEventBus must be an EventEmitter');
    assert.strictEqual(typeof newListener.verifyFubWebhookSignature, 'function', 'verifyFubWebhookSignature must be a function');
  });

  // 3. Both re-export the same underlying fubService instance
  await test('integrations/ and integration/ share the same fubService (module identity)', () => {
    const legacy = require('../../integrations/fub-webhook-listener');
    const newListener = require('../../integration/fub-webhook-listener');
    assert.strictEqual(legacy.fubService, newListener.fubService, 'must be the same FUBService instance');
  });

  // 4. FUBService handles webhook payload and returns correct shape
  await test('FUBService.handleWebhookPayload returns { received: true, event: mapped }', () => {
    const FUBService = require('../../lib/services/FUBService');
    const svc = new FUBService({
      registerEventHandlers: false,
      logger: { log() {}, warn() {}, error() {} }
    });
    const result = svc.handleWebhookPayload({ event: 'peopleCreated', id: 'lead-x' });
    assert.strictEqual(result.received, true);
    assert.strictEqual(result.event, 'lead.created');
  });

  // 5. FUBService emits events asynchronously (non-blocking)
  await test('FUBService.handleWebhookPayload emits event via setImmediate (non-blocking)', async () => {
    const FUBService = require('../../lib/services/FUBService');
    const eventBus = new EventEmitter();
    const svc = new FUBService({
      eventBus,
      registerEventHandlers: false,
      logger: { log() {}, warn() {}, error() {} }
    });

    const emitted = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Event not emitted within 500ms')), 500);
      eventBus.once('lead.updated', (payload) => {
        clearTimeout(t);
        resolve(payload);
      });
    });

    const result = svc.handleWebhookPayload({ event: 'peopleUpdated', id: 'lead-y' });
    assert.strictEqual(result.received, true); // synchronous return before event fires

    await emitted;
  });

  // 6. BillingService class has all required methods (checked via source, stripe may not be installed)
  await test('BillingService class defines all required methods', () => {
    const fs = require('fs');
    const content = fs.readFileSync(require.resolve('../../lib/services/BillingService'), 'utf8');
    const requiredMethods = [
      'createCustomer', 'createSubscription', 'createSetupIntent',
      'getSubscriptionStatus', 'cancelSubscription', 'createCompleteSubscription',
      'getUserSubscriptionStatus', 'changePlan', 'previewPlanChange',
      'cancelManagedSubscription', 'reactivateSubscription', 'getBillingCycleInfo',
      'getRenewalHistory', 'getUpcomingRenewals', 'getPortalConfig',
      'createPortalSession', 'getCustomerSubscriptions', 'getCustomerInvoices',
      'getCustomerPaymentMethods', 'handleWebhook', 'verifyWebhookSignature',
      'getSubscriptionAnalytics', 'syncAllSubscriptions', 'initializeBilling'
    ];
    for (const method of requiredMethods) {
      assert.ok(
        content.includes(`async ${method}(`) || content.includes(`${method}(`),
        `BillingService must define method: ${method}`
      );
    }
    // Verify it exports a singleton instance
    assert.ok(content.includes('module.exports = new BillingService()'), 'must export singleton instance');
  });

  // 7. Routes delegate to BillingService (no inline DB/API calls in routes)
  await test('routes/billing.js contains no direct stripe.* or pool.query calls', () => {
    const fs = require('fs');
    const content = fs.readFileSync(require.resolve('../../routes/billing'), 'utf8');
    const forbidden = [
      /stripe\.customers\./,
      /stripe\.subscriptions\./,
      /stripe\.checkout\./,
      /pool\.query/,
      /new Pool\(/
    ];
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(content), `routes/billing.js must not contain: ${pattern}`);
    }
  });

  // 8. No inline DB/API calls in integration/fub-webhook-listener.js route file
  await test('integration/fub-webhook-listener.js route is thin (no inline axios/fetch)', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../integration/fub-webhook-listener.js'), 'utf8'
    );
    assert.ok(!content.includes('axios.get'), 'route must not make inline axios.get calls');
    assert.ok(!content.includes('axios.post'), 'route must not make inline axios.post calls');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
