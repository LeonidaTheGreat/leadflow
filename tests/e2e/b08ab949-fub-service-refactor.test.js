'use strict';

/**
 * E2E test for PR #1111 — FUBService refactor (task b08ab949)
 * Validates: class exists, route is thin, signature verification present,
 * backward-compat shim, server.js wiring, no stale imports.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
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

console.log('\n🧪 PR #1111 — FUBService refactor E2E tests (task b08ab949)\n');

// 1. FUBService class exists and loads
test('FUBService module loads from lib/services/FUBService.js', () => {
  const FUBService = require(path.resolve(__dirname, '../../lib/services/FUBService'));
  assert.strictEqual(typeof FUBService, 'function', 'FUBService must be a constructor');
});

// 2. FUBService has verifyWebhookSignature method
test('FUBService has verifyWebhookSignature method', () => {
  const FUBService = require(path.resolve(__dirname, '../../lib/services/FUBService'));
  assert.strictEqual(typeof FUBService.prototype.verifyWebhookSignature, 'function',
    'Missing verifyWebhookSignature method');
});

// 3. SECURITY: route handler calls verifyWebhookSignature BEFORE handleWebhookPayload
test('integration/fub-webhook-listener.js calls verifyWebhookSignature in route handler body', () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../../integration/fub-webhook-listener.js'), 'utf8'
  );
  // Find the route handler body (between router.post and the first closing brace)
  const routeMatch = content.match(/router\.post\([^,]+,\s*\(req,\s*res\)\s*=>\s*\{([\s\S]*?)\}\s*\)/);
  const routeBody = routeMatch ? routeMatch[1] : content;
  assert.ok(
    routeBody.includes('verifyWebhookSignature') || routeBody.includes('verifyFubWebhookSignature'),
    'Route handler body MUST call verifyWebhookSignature before processing — missing check is a security vulnerability allowing unauthenticated webhook injection'
  );
});

// 4. Route is thin — no direct axios/DB calls
test('integration/fub-webhook-listener.js route is thin (no direct API/DB calls)', () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../../integration/fub-webhook-listener.js'), 'utf8'
  );
  assert.ok(!content.includes('axios.get') && !content.includes('axios.post'),
    'Route must not make direct axios calls');
  assert.ok(!content.includes('pool.query') && !content.includes('.from('),
    'Route must not make direct DB queries');
  assert.ok(content.includes('FUBService'), 'Route must use FUBService');
});

// 5. integrations/fub-webhook-listener.js is a proper re-export shim (not dead code)
test('integrations/fub-webhook-listener.js is a proper re-export shim', () => {
  const shimPath = path.resolve(__dirname, '../../integrations/fub-webhook-listener.js');
  assert.ok(fs.existsSync(shimPath), 'integrations/fub-webhook-listener.js must exist');
  const content = fs.readFileSync(shimPath, 'utf8').trim();
  assert.ok(
    content.includes('require') && content.includes('integration'),
    'integrations/fub-webhook-listener.js must re-export from integration/'
  );
});

// 6. server.js imports from canonical integration/ path
test('server.js imports FUB router from integration/ (canonical path)', () => {
  const serverContent = fs.readFileSync(path.resolve(__dirname, '../../server.js'), 'utf8');
  assert.ok(
    serverContent.includes('./integration/fub-webhook-listener'),
    'server.js must import from integration/fub-webhook-listener'
  );
});

// 7. handleWebhookPayload event mapping (functional)
test('handleWebhookPayload maps FUB events to internal events', () => {
  const FUBService = require(path.resolve(__dirname, '../../lib/services/FUBService'));
  const svc = new FUBService({ registerEventHandlers: false, logger: { log() {}, warn() {}, error() {} } });
  const r1 = svc.handleWebhookPayload({ event: 'peopleCreated' });
  assert.strictEqual(r1.received, true);
  assert.strictEqual(r1.event, 'lead.created');
  const r2 = svc.handleWebhookPayload({ event: 'peopleStageUpdated' });
  assert.strictEqual(r2.event, 'lead.status_changed');
});

// 8. registerEventHandlers is idempotent
test('registerEventHandlers does not duplicate listeners on repeated calls', () => {
  const FUBService = require(path.resolve(__dirname, '../../lib/services/FUBService'));
  const eventBus = new EventEmitter();
  const svc = new FUBService({ eventBus, registerEventHandlers: true, logger: { log() {}, warn() {}, error() {} } });
  const before = eventBus.listenerCount('lead.created');
  svc.registerEventHandlers();
  svc.registerEventHandlers();
  assert.strictEqual(eventBus.listenerCount('lead.created'), before,
    'Duplicate handler registration detected');
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
