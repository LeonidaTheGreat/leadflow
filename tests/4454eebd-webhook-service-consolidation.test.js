/**
 * E2E Test: WebhookService Consolidation (PR #1118)
 * UC: refactor-consolidate-webhook-handler-js
 *
 * Verifies:
 * 1. WebhookService class exists and exports expected interface
 * 2. Old webhook-handler.js is deleted
 * 3. Old webhook-processor.js is deleted
 * 4. BillingService imports WebhookService (not webhook-processor)
 * 5. stripe-subscriptions/index.js does not import webhook-processor
 * 6. WebhookService processes events correctly (unit logic)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

// --- 1. Old files deleted ---
test('webhook-handler.js is deleted', () => {
  const filePath = path.join(projectRoot, 'lib', 'webhook-handler.js');
  assert(!fs.existsSync(filePath), `lib/webhook-handler.js still exists — should be deleted`);
});

test('webhook-processor.js is deleted', () => {
  const filePath = path.join(projectRoot, 'lib', 'webhook-processor.js');
  assert(!fs.existsSync(filePath), `lib/webhook-processor.js still exists — should be deleted`);
});

// --- 2. WebhookService exists with correct interface ---
test('WebhookService.js exists in lib/services/', () => {
  const filePath = path.join(projectRoot, 'lib', 'services', 'WebhookService.js');
  assert(fs.existsSync(filePath), 'lib/services/WebhookService.js does not exist');
});

test('WebhookService exports processWebhookEvent and handleIncomingWebhook', () => {
  const WebhookService = require(path.join(projectRoot, 'lib', 'services', 'WebhookService'));
  assert(typeof WebhookService.processWebhookEvent === 'function',
    'processWebhookEvent not exported from WebhookService');
  assert(typeof WebhookService.handleIncomingWebhook === 'function',
    'handleIncomingWebhook not exported from WebhookService');
});

test('WebhookService singleton exports WebhookService class', () => {
  const ws = require(path.join(projectRoot, 'lib', 'services', 'WebhookService'));
  assert(ws.WebhookService, 'WebhookService class not exported as named export');
  const instance = new ws.WebhookService({ stripe: null, db: null });
  assert(typeof instance.processWebhookEvent === 'function', 'instance missing processWebhookEvent');
});

// --- 3. BillingService uses WebhookService, not webhook-processor ---
test('BillingService.js imports WebhookService (not webhook-processor)', () => {
  const billingServicePath = path.join(projectRoot, 'lib', 'services', 'BillingService.js');
  const src = fs.readFileSync(billingServicePath, 'utf8');
  assert(!src.includes("require('../webhook-processor')"),
    "BillingService.js still requires '../webhook-processor' — stale import");
  assert(src.includes('WebhookService') || src.includes('webhookService'),
    "BillingService.js does not reference WebhookService");
});

// --- 4. stripe-subscriptions/index.js does not import webhook-processor ---
test('stripe-subscriptions/index.js does not import webhook-processor', () => {
  const indexPath = path.join(projectRoot, 'stripe-subscriptions', 'index.js');
  const src = fs.readFileSync(indexPath, 'utf8');
  assert(!src.includes('webhook-processor'),
    "stripe-subscriptions/index.js still imports webhook-processor — stale reference");
});

// --- 5. WebhookService handles known events ---
test('WebhookService returns processed=false for unknown event types', async () => {
  const { WebhookService } = require(path.join(projectRoot, 'lib', 'services', 'WebhookService'));
  const ws = new WebhookService({ stripe: null, db: null });
  const result = await ws.processWebhookEvent({ type: 'unknown.event.type', id: 'evt_test', data: { object: {} } });
  assert(result.success === true, 'expected success=true for unknown event');
  assert(result.processed === false, 'expected processed=false for unhandled event type');
});

test('WebhookService handles customer.subscription.created with no user_id gracefully', async () => {
  const { WebhookService } = require(path.join(projectRoot, 'lib', 'services', 'WebhookService'));
  const ws = new WebhookService({ stripe: null, db: null });
  const event = {
    type: 'customer.subscription.created',
    id: 'evt_test_create',
    data: {
      object: {
        id: 'sub_test',
        status: 'active',
        metadata: {},
        customer: 'cus_test',
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
      }
    }
  };
  const result = await ws.processWebhookEvent(event);
  assert(result.success === true, 'expected success=true');
  assert(result.result && result.result.acknowledged === true, 'expected acknowledged=true');
  assert(result.result.userUpdated === false, 'expected userUpdated=false when no user_id');
});

// --- Summary ---
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\n⚠️  Some tests failed — PR is not ready to merge.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed.');
}
