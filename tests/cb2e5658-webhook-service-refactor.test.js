/**
 * E2E Test: PR #1125 — WebhookService refactor
 * Verifies that webhook-handler.js and webhook-processor.js have been
 * consolidated into lib/services/WebhookService.js.
 *
 * Run: node tests/cb2e5658-webhook-service-refactor.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

// ── Mock 'stripe' module (not installed in root node_modules) ─────────────
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'stripe') {
    return function MockStripe() {
      return { webhooks: { constructEvent: () => {} } };
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      // async test — return promise, handled below
      return result.then(() => {
        console.log(`  PASS: ${name}`);
        passed++;
      }).catch(err => {
        console.log(`  FAIL: ${name}`);
        console.log(`    ${err.message}`);
        failed++;
      });
    }
    console.log(`  PASS: ${name}`);
    passed++;
    return Promise.resolve();
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`    ${err.message}`);
    failed++;
    return Promise.resolve();
  }
}

async function run() {
  console.log('\n=== E2E: WebhookService refactor (PR #1125) ===\n');

  // ── 1. Old files are deleted ────────────────────────────────────────────
  console.log('1. Old files deleted');

  await test('lib/webhook-handler.js is deleted', () => {
    assert.strictEqual(
      fs.existsSync(path.join(ROOT, 'lib/webhook-handler.js')),
      false,
      'lib/webhook-handler.js still exists — should be deleted'
    );
  });

  await test('lib/webhook-processor.js is deleted', () => {
    assert.strictEqual(
      fs.existsSync(path.join(ROOT, 'lib/webhook-processor.js')),
      false,
      'lib/webhook-processor.js still exists — should be deleted'
    );
  });

  // ── 2. New service file exists ──────────────────────────────────────────
  console.log('\n2. New WebhookService file exists');

  await test('lib/services/WebhookService.js exists', () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, 'lib/services/WebhookService.js')),
      'lib/services/WebhookService.js does not exist'
    );
  });

  // ── 3. WebhookService loads and has correct interface ───────────────────
  console.log('\n3. WebhookService interface');

  let webhookService;
  try {
    webhookService = require(path.join(ROOT, 'lib/services/WebhookService'));
    console.log('  (loaded successfully)');
  } catch (err) {
    console.log(`  FAIL: Cannot load WebhookService: ${err.message}`);
    failed++;
    summarize();
    process.exit(1);
  }

  await test('module.exports is a WebhookService instance', () => {
    assert.ok(webhookService, 'module.exports is falsy');
    assert.strictEqual(typeof webhookService, 'object', 'module.exports is not an object');
  });

  await test('WebhookService class exported as .WebhookService', () => {
    assert.ok(webhookService.WebhookService, 'WebhookService class not exported as .WebhookService');
    assert.strictEqual(typeof webhookService.WebhookService, 'function');
  });

  await test('processWebhookEvent is a function', () => {
    assert.strictEqual(typeof webhookService.processWebhookEvent, 'function');
  });

  await test('handleIncomingWebhook is a function', () => {
    assert.strictEqual(typeof webhookService.handleIncomingWebhook, 'function');
  });

  await test('EVENT_HANDLERS covers key Stripe events', () => {
    const h = webhookService.EVENT_HANDLERS;
    assert.ok(h, 'EVENT_HANDLERS not defined');
    assert.ok(h['customer.subscription.created'], 'missing customer.subscription.created');
    assert.ok(h['customer.subscription.deleted'], 'missing customer.subscription.deleted');
    assert.ok(h['invoice.payment_succeeded'], 'missing invoice.payment_succeeded');
    assert.ok(h['checkout.session.completed'], 'missing checkout.session.completed');
  });

  // ── 4. processWebhookEvent behavior (no DB) ─────────────────────────────
  console.log('\n4. processWebhookEvent behavior');

  await test('returns success=true, processed=false for unknown event type', async () => {
    const { WebhookService } = webhookService;
    const svc = new WebhookService({ stripe: null, db: null });
    const result = await svc.processWebhookEvent({
      id: 'evt_unknown',
      type: 'unknown.event.xyz',
      data: { object: {} },
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.processed, false);
    assert.ok(result.reason, 'result.reason should be set');
  });

  await test('returns success=true, processed=true for subscription.created (no DB)', async () => {
    const { WebhookService } = webhookService;
    const svc = new WebhookService({ stripe: null, db: null });
    const result = await svc.processWebhookEvent({
      id: 'evt_sub_created',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test',
          status: 'active',
          customer: 'cus_test',
          metadata: {},
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
          items: { data: [{ price: { id: 'price_test', recurring: { interval: 'month' } } }] },
        },
      },
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.processed, true);
  });

  // ── 5. Consumer wiring ───────────────────────────────────────────────────
  console.log('\n5. Consumer wiring');

  await test('BillingService.js imports WebhookService', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/services/BillingService.js'), 'utf8');
    assert.ok(src.includes("require('./WebhookService')"), "BillingService does not import WebhookService");
  });

  await test('BillingService.js does not import webhook-processor', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/services/BillingService.js'), 'utf8');
    assert.ok(!src.includes("require('../webhook-processor')"), "BillingService still imports webhook-processor");
  });

  await test('stripe-subscriptions/index.js imports WebhookService', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stripe-subscriptions/index.js'), 'utf8');
    assert.ok(src.includes("require('../lib/services/WebhookService')"), "stripe-subscriptions/index.js does not import WebhookService");
  });

  await test('stripe-subscriptions/index.js does not import webhook-processor', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stripe-subscriptions/index.js'), 'utf8');
    assert.ok(!src.includes("require('../lib/webhook-processor')"), "stripe-subscriptions/index.js still imports webhook-processor");
  });

  summarize();
}

function summarize() {
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
