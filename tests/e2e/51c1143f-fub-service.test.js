'use strict';

/**
 * E2E test for FUBService refactor (task 51c1143f)
 * Validates: class exists, methods present, route thin, module re-export
 */

const assert = require('assert');
const path = require('path');
const { EventEmitter } = require('events');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}: ${err.message}`);
  }
}

console.log('\n🧪 FUBService refactor E2E tests (task 51c1143f)\n');

// 1. FUBService class exists and is loadable
test('FUBService module loads from lib/services/FUBService.js', () => {
  const FUBService = require(path.resolve(__dirname, '../../lib/services/FUBService'));
  assert.strictEqual(typeof FUBService, 'function', 'FUBService must be a class (constructor function)');
});

// 2. FUBService has required methods
test('FUBService has all required methods', () => {
  const FUBService = require(path.resolve(__dirname, '../../lib/services/FUBService'));
  const proto = FUBService.prototype;
  const required = [
    'verifyWebhookSignature',
    'handleWebhookPayload',
    'handleLeadCreated',
    'handleLeadUpdated',
    'handleLeadStatusChanged',
    'handleLeadAssigned',
    'fetchLeadFromFub',
    'logSmsInFub',
    'registerEventHandlers',
    'mapEvent',
    'logFubEvent'
  ];
  for (const method of required) {
    assert.strictEqual(typeof proto[method], 'function', `Missing method: ${method}`);
  }
});

// 3. FUBService instantiates with injected dependencies (testable constructor)
test('FUBService accepts injectable dependencies and registers event handlers', () => {
  const FUBService = require(path.resolve(__dirname, '../../lib/services/FUBService'));
  const eventBus = new EventEmitter();
  const logger = { log() {}, warn() {}, error() {} };
  const svc = new FUBService({ eventBus, logger, registerEventHandlers: true });
  assert.ok(svc.eventBus === eventBus, 'eventBus should be injected instance');
  assert.ok(svc.handlersRegistered === true, 'handlers should be registered after construction');
  // Event handlers should be attached
  assert.ok(eventBus.listenerCount('lead.created') > 0, 'lead.created handler should be registered');
  assert.ok(eventBus.listenerCount('lead.updated') > 0, 'lead.updated handler should be registered');
  assert.ok(eventBus.listenerCount('lead.status_changed') > 0, 'lead.status_changed handler should be registered');
  assert.ok(eventBus.listenerCount('lead.assigned') > 0, 'lead.assigned handler should be registered');
});

// 4. handleWebhookPayload returns correct shape and maps events
test('handleWebhookPayload maps FUB event names to internal names', () => {
  const FUBService = require(path.resolve(__dirname, '../../lib/services/FUBService'));
  const svc = new FUBService({ registerEventHandlers: false, logger: { log() {}, warn() {}, error() {} } });

  const result = svc.handleWebhookPayload({ event: 'peopleCreated', id: 'test-1' });
  assert.strictEqual(result.received, true);
  assert.strictEqual(result.event, 'lead.created');

  const result2 = svc.handleWebhookPayload({ event: 'peopleStageUpdated', id: 'test-2' });
  assert.strictEqual(result2.event, 'lead.status_changed');

  const result3 = svc.handleWebhookPayload({ event: 'unknownEvent' });
  assert.strictEqual(result3.event, 'unknownEvent', 'Unknown events pass through unchanged');
});

// 5. integration/fub-webhook-listener.js exists and re-exports correctly
test('integration/fub-webhook-listener.js exports router, fubService, fubEventBus, verifyFubWebhookSignature', () => {
  const listener = require(path.resolve(__dirname, '../../integration/fub-webhook-listener'));
  assert.ok(listener.router, 'Must export router');
  assert.ok(listener.fubService, 'Must export fubService instance');
  assert.ok(listener.fubEventBus instanceof EventEmitter, 'fubEventBus must be an EventEmitter');
  assert.strictEqual(typeof listener.verifyFubWebhookSignature, 'function', 'Must export verifyFubWebhookSignature');
});

// 6. integrations/fub-webhook-listener.js re-exports from integration/ (backward compat shim)
test('integrations/fub-webhook-listener.js is a re-export shim (backward compat)', () => {
  const oldPath = require(path.resolve(__dirname, '../../integrations/fub-webhook-listener'));
  const newPath = require(path.resolve(__dirname, '../../integration/fub-webhook-listener'));
  // Both should export the same router
  assert.strictEqual(oldPath.router, newPath.router, 'Old path must re-export same router as new path');
  assert.strictEqual(oldPath.fubService, newPath.fubService, 'Old path must re-export same fubService');
});

// 7. server.js imports from integration/ (new canonical path)
test('server.js imports FUB router from integration/ (new canonical path)', () => {
  const fs = require('fs');
  const serverContent = fs.readFileSync(path.resolve(__dirname, '../../server.js'), 'utf8');
  assert.ok(
    serverContent.includes('./integration/fub-webhook-listener'),
    'server.js must import from integration/fub-webhook-listener (not integrations/)'
  );
});

// 8. Route handler is thin — integration/fub-webhook-listener.js has no direct API calls or DB queries
test('integration/fub-webhook-listener.js route is thin (no direct API calls in route handler)', () => {
  const fs = require('fs');
  const content = fs.readFileSync(path.resolve(__dirname, '../../integration/fub-webhook-listener.js'), 'utf8');
  // Route file should not contain axios calls or DB client calls
  assert.ok(!content.includes('axios.get') && !content.includes('axios.post'), 'Route must not make direct axios calls');
  assert.ok(!content.includes('pg.query') && !content.includes('.from('), 'Route must not make direct DB queries');
  // Must delegate to FUBService
  assert.ok(content.includes('FUBService'), 'Route must use FUBService');
  assert.ok(content.includes('handleWebhookPayload'), 'Route must delegate to handleWebhookPayload');
});

// 9. FUBService is in lib/services/ (not in integrations/ or routes/)
test('FUBService lives in lib/services/ per architecture rules', () => {
  const fs = require('fs');
  assert.ok(
    fs.existsSync(path.resolve(__dirname, '../../lib/services/FUBService.js')),
    'FUBService.js must exist at lib/services/FUBService.js'
  );
  assert.ok(
    !fs.existsSync(path.resolve(__dirname, '../../integrations/FUBService.js')),
    'FUBService.js must NOT exist in integrations/'
  );
});

// 10. Double-registration guard — registering handlers twice does not duplicate listeners
test('registerEventHandlers is idempotent (no double-registration)', () => {
  const FUBService = require(path.resolve(__dirname, '../../lib/services/FUBService'));
  const eventBus = new EventEmitter();
  const svc = new FUBService({ eventBus, registerEventHandlers: true, logger: { log() {}, warn() {}, error() {} } });
  const countBefore = eventBus.listenerCount('lead.created');
  svc.registerEventHandlers();
  svc.registerEventHandlers();
  const countAfter = eventBus.listenerCount('lead.created');
  assert.strictEqual(countBefore, countAfter, 'Calling registerEventHandlers multiple times must not add duplicate listeners');
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
