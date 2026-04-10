'use strict';

/**
 * E2E test for PR #1111 — FUBService refactor (task b08ab949)
 * QC-authored test: verifies service creation, route thinness,
 * old-file deletion, and dependency chain integrity.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

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

console.log('\n🧪 PR #1111 — FUBService refactor E2E tests\n');

// 1. FUBService class exists and is importable
test('FUBService loads from lib/services/FUBService.js', () => {
  const FUBService = require(path.join(ROOT, 'lib/services/FUBService'));
  assert.strictEqual(typeof FUBService, 'function', 'must be a constructor');
});

// 2. FUBService has required methods
test('FUBService has all required methods', () => {
  const FUBService = require(path.join(ROOT, 'lib/services/FUBService'));
  const proto = FUBService.prototype;
  for (const m of ['verifyWebhookSignature', 'handleWebhookPayload', 'mapEvent', 'registerEventHandlers']) {
    assert.strictEqual(typeof proto[m], 'function', `missing method: ${m}`);
  }
});

// 3. BillingService file exists and is a class definition
test('BillingService file exists and exports a class', () => {
  const billingPath = path.join(ROOT, 'lib/services/BillingService.js');
  assert.ok(fs.existsSync(billingPath), 'lib/services/BillingService.js must exist');
  const src = fs.readFileSync(billingPath, 'utf8');
  assert.ok(src.includes('class BillingService'), 'BillingService.js must define a class BillingService');
  assert.ok(src.includes('module.exports'), 'BillingService.js must export the class');
});

// 4. Old billing files are deleted (refactor is complete)
test('lib/billing.js is deleted', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'lib/billing.js')), 'lib/billing.js still exists — delete it');
});

test('lib/billing-enhanced.js is deleted', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'lib/billing-enhanced.js')), 'lib/billing-enhanced.js still exists — delete it');
});

test('routes/billing-enhanced.js is deleted', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'routes/billing-enhanced.js')), 'routes/billing-enhanced.js still exists — delete it');
});

// 5. Route is thin: routes/billing.js uses BillingService, has no inline DB queries
test('routes/billing.js imports BillingService (not inline pg Pool)', () => {
  const routeSrc = fs.readFileSync(path.join(ROOT, 'routes/billing.js'), 'utf8');
  assert.ok(routeSrc.includes('BillingService'), 'routes/billing.js must import BillingService');
  assert.ok(!routeSrc.includes('new Pool('), 'routes/billing.js must not create a pg Pool inline');
  assert.ok(!routeSrc.includes("require('pg')"), "routes/billing.js must not require pg directly");
});

// 6. integration/fub-webhook-listener.js uses FUBService (not inline logic)
test('integration/fub-webhook-listener.js delegates to FUBService', () => {
  const src = fs.readFileSync(path.join(ROOT, 'integration/fub-webhook-listener.js'), 'utf8');
  assert.ok(src.includes('FUBService'), 'webhook listener must import FUBService');
  assert.ok(!src.includes('createHmac'), 'crypto logic must be in FUBService, not the route');
});

// 7. FUBService must NOT import the old lib/twilio-sms.js (replaced by TwilioService in PR #1108)
test('FUBService does not import deprecated lib/twilio-sms.js', () => {
  const fubSrc = fs.readFileSync(path.join(ROOT, 'lib/services/FUBService.js'), 'utf8');
  assert.ok(
    !fubSrc.includes("require('../twilio-sms')"),
    'FUBService still imports lib/twilio-sms.js which was deleted from origin/main in PR #1108. ' +
    'This branch is stale. Update FUBService to use TwilioService instead.'
  );
});

// 8. No backwards-compat shim in integrations/ (CLAUDE.md: no compat hacks)
test('integrations/fub-webhook-listener.js is not a shim re-export', () => {
  const shimPath = path.join(ROOT, 'integrations/fub-webhook-listener.js');
  if (!fs.existsSync(shimPath)) return; // Deleted is fine
  const src = fs.readFileSync(shimPath, 'utf8');
  assert.ok(
    !src.trim().includes("module.exports = require('../integration/fub-webhook-listener')"),
    'integrations/fub-webhook-listener.js is a backwards-compat shim — prohibited by CLAUDE.md. Remove it and update callers.'
  );
});

// 9. Admin routes must not create inline pg Pools (must use shared pool)
test('routes/admin/activation-outreach.js does not create inline pg Pool', () => {
  const src = fs.readFileSync(path.join(ROOT, 'routes/admin/activation-outreach.js'), 'utf8');
  assert.ok(!src.includes('new Pool('), 'activation-outreach must not create an inline pg Pool');
});

test('routes/admin/funnel-diagnostics.js does not create inline pg Pool (if exists)', () => {
  const p = path.join(ROOT, 'routes/admin/funnel-diagnostics.js');
  if (!fs.existsSync(p)) return; // File not present in this local checkout; check the PR remote
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(!src.includes('new Pool('), 'funnel-diagnostics must not create an inline pg Pool');
});

// 10. server.js imports from integration/ (not integrations/ shim)
test('server.js imports fub-webhook-listener from integration/ (not integrations/)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.ok(src.includes("require('./integration/fub-webhook-listener')"), 'server.js must import from integration/ not integrations/');
});

// Results
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
