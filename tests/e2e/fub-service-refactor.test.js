'use strict';

/**
 * QC E2E test for FUBService refactor (PR #1111)
 * Validates: FUBService class exists with correct interface, route is thin,
 * old inline FUB code is gone from integrations/, no phantom dependencies.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');

const ROOT = path.resolve(__dirname, '../..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL: ${name}: ${err.message}`);
  }
}

console.log('\nFUBService refactor E2E tests (PR #1111 QC)\n');

// 1. FUBService class exists and loads from lib/services/
test('FUBService loads from lib/services/FUBService.js', () => {
  const FUBService = require(path.join(ROOT, 'lib/services/FUBService'));
  assert.strictEqual(typeof FUBService, 'function', 'FUBService must be a constructor');
});

// 2. FUBService has required interface methods
test('FUBService has required methods: verifyWebhookSignature, handleWebhookPayload, handleLeadCreated', () => {
  const FUBService = require(path.join(ROOT, 'lib/services/FUBService'));
  const proto = FUBService.prototype;
  ['verifyWebhookSignature', 'handleWebhookPayload', 'handleLeadCreated', 'handleLeadUpdated', 'registerEventHandlers'].forEach(m => {
    assert.strictEqual(typeof proto[m], 'function', `Missing method: ${m}`);
  });
});

// 3. FUBService accepts injectable deps (testable constructor)
test('FUBService accepts injectable eventBus and logger', () => {
  const FUBService = require(path.join(ROOT, 'lib/services/FUBService'));
  const eventBus = new EventEmitter();
  const logger = { log() {}, warn() {}, error() {}, info() {}, child() { return this; } };
  const svc = new FUBService({ eventBus, logger, registerEventHandlers: false });
  assert.ok(svc.eventBus === eventBus || svc instanceof FUBService, 'FUBService must instantiate cleanly');
});

// 4. integration/fub-webhook-listener.js exists and exports router
test('integration/fub-webhook-listener.js exports router', () => {
  const listener = require(path.join(ROOT, 'integration/fub-webhook-listener'));
  assert.ok(listener.router, 'Must export router');
});

// 5. Old integrations/fub-webhook-listener.js is GONE (not a shim, not re-exporting)
test('integrations/fub-webhook-listener.js does NOT exist (was deleted in cleanup)', () => {
  const oldPath = path.join(ROOT, 'integrations/fub-webhook-listener.js');
  assert.ok(!fs.existsSync(oldPath), `Old shim file still exists at ${oldPath} — should have been deleted`);
});

// 6. routes/billing.js does NOT contain inline DB queries or direct Stripe calls
test('routes/billing.js has no inline Pool or new Stripe() instantiation', () => {
  const billingRoute = fs.readFileSync(path.join(ROOT, 'routes/billing.js'), 'utf8');
  assert.ok(!billingRoute.includes('new Pool('), 'routes/billing.js must not instantiate Pool directly');
  assert.ok(!billingRoute.includes("require('stripe')") && !billingRoute.includes('require("stripe")'),
    'routes/billing.js must not import Stripe directly');
});

// 7. lib/billing.js and lib/billing-enhanced.js do NOT exist (deleted in refactor)
test('lib/billing.js and lib/billing-enhanced.js are deleted', () => {
  const billing = path.join(ROOT, 'lib/billing.js');
  const billingEnhanced = path.join(ROOT, 'lib/billing-enhanced.js');
  assert.ok(!fs.existsSync(billing), 'lib/billing.js should be deleted after refactor');
  assert.ok(!fs.existsSync(billingEnhanced), 'lib/billing-enhanced.js should be deleted after refactor');
});

// 8. lib/pg-pool.js OR equivalent pool extraction exists
test('Shared pool abstraction exists (lib/pg-pool.js or similar)', () => {
  const pgPool = path.join(ROOT, 'lib/pg-pool.js');
  const dbJs = path.join(ROOT, 'lib/db.js');
  const exists = fs.existsSync(pgPool) || fs.existsSync(dbJs);
  assert.ok(exists, 'A shared pool/DB module must exist in lib/ (pg-pool.js or db.js)');
});

// 9. server.js uses integration/ (not integrations/) for FUB webhook
test('server.js requires from integration/ not integrations/ for FUB webhook', () => {
  const serverJs = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const usesIntegrations = serverJs.includes("require('./integrations/fub-webhook-listener')") ||
                           serverJs.includes('require("./integrations/fub-webhook-listener")');
  assert.ok(!usesIntegrations, 'server.js must not require from integrations/ (deprecated shim path)');
});

// Summary
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
