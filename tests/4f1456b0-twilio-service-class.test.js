/**
 * E2E test for PR #1106 — TwilioService class refactor (task 4f1456b0)
 *
 * Validates:
 * 1. lib/twilio-sms.js is deleted (old file gone)
 * 2. lib/services/TwilioService.js exists and exports correctly
 * 3. TwilioService class has injectable constructor (db, twilioFactory)
 * 4. Static error classification methods work correctly
 * 5. FUBService.js imports from TwilioService (not from twilio-sms)
 * 6. No production code imports from the deleted lib/twilio-sms.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n=== PR #1106: TwilioService class refactor ===\n');

// ── 1. Old file deleted ──────────────────────────────────────────
test('lib/twilio-sms.js is deleted', () => {
  const oldPath = path.join(ROOT, 'lib', 'twilio-sms.js');
  assert(!fs.existsSync(oldPath), 'lib/twilio-sms.js still exists — refactor incomplete');
});

// ── 2. New service file exists ───────────────────────────────────
test('lib/services/TwilioService.js exists', () => {
  const newPath = path.join(ROOT, 'lib', 'services', 'TwilioService.js');
  assert(fs.existsSync(newPath), 'lib/services/TwilioService.js not found');
});

// ── 3. TwilioService is a class with injectable deps ─────────────
test('TwilioService is a class with constructor that accepts options', () => {
  const TwilioService = require(path.join(ROOT, 'lib', 'services', 'TwilioService.js'));
  assert(typeof TwilioService === 'function', 'TwilioService must be a constructor/class');
  // Inject a mock db to avoid real DB calls
  const mockDb = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) };
  const mockFactory = () => ({ messages: { create: async () => ({ sid: 'SM_test', status: 'queued' }) } });
  const svc = new TwilioService({ db: mockDb, twilioFactory: mockFactory });
  assert(typeof svc.sendSms === 'function', 'TwilioService must have sendSms method');
  assert(typeof svc.resolveTwilioContext === 'function', 'TwilioService must have resolveTwilioContext method');
});

// ── 4. Static error classification methods exist ──────────────────
test('TwilioService.classifyTwilioError is a static method', () => {
  const TwilioService = require(path.join(ROOT, 'lib', 'services', 'TwilioService.js'));
  assert(typeof TwilioService.classifyTwilioError === 'function', 'classifyTwilioError must be a static/exported function');
  const result = TwilioService.classifyTwilioError({ code: 30034, message: 'carrier filtered' });
  assert.strictEqual(result.category, 'A2P_BLOCKED', 'code 30034 must classify as A2P_BLOCKED');
  assert.strictEqual(result.retryable, false, 'A2P errors must be non-retryable');
});

test('TwilioService.isA2pBlockedError works correctly', () => {
  const TwilioService = require(path.join(ROOT, 'lib', 'services', 'TwilioService.js'));
  assert(typeof TwilioService.isA2pBlockedError === 'function', 'isA2pBlockedError must be exported');
  assert.strictEqual(TwilioService.isA2pBlockedError({ code: 30007 }), true, '30007 is A2P blocked');
  assert.strictEqual(TwilioService.isA2pBlockedError({ code: 20429 }), false, '20429 is not A2P blocked');
});

// ── 5. FUBService imports from TwilioService ─────────────────────
test('FUBService.js imports TwilioService (not twilio-sms)', () => {
  const fubSrc = fs.readFileSync(path.join(ROOT, 'lib', 'services', 'FUBService.js'), 'utf8');
  assert(fubSrc.includes("require('./TwilioService')"), 'FUBService must import TwilioService');
  assert(!fubSrc.includes("require('../twilio-sms')"), 'FUBService must not import from old twilio-sms');
});

// ── 6. No production code imports from deleted twilio-sms ─────────
test('No routes/ imports from lib/twilio-sms', () => {
  const routesDir = path.join(ROOT, 'routes');
  if (!fs.existsSync(routesDir)) return; // no routes dir = pass
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const src = fs.readFileSync(path.join(routesDir, file), 'utf8');
    assert(!src.includes("require('../lib/twilio-sms')") && !src.includes("require('./twilio-sms')"),
      `${file} imports from deleted twilio-sms`);
  }
});

test('server.js does not import from twilio-sms', () => {
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert(!serverSrc.includes("require('./lib/twilio-sms')") && !serverSrc.includes("require('../lib/twilio-sms')"),
    'server.js imports from deleted twilio-sms');
});

// ── 7. DeliveryStatus and error code constants exported ──────────
test('TwilioErrorCodes and A2P_ERROR_CODE_SET are exported', () => {
  const TwilioService = require(path.join(ROOT, 'lib', 'services', 'TwilioService.js'));
  assert(TwilioService.TwilioErrorCodes, 'TwilioErrorCodes must be exported');
  assert(TwilioService.A2P_ERROR_CODE_SET, 'A2P_ERROR_CODE_SET must be exported');
  assert(TwilioService.A2P_ERROR_CODE_SET.has(30034), 'A2P_ERROR_CODE_SET must include 30034');
  assert(TwilioService.DeliveryStatus, 'DeliveryStatus must be exported');
  assert.strictEqual(TwilioService.DeliveryStatus.DELIVERED, 'delivered');
});

// ── Summary ───────────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`);
console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
console.log('='.repeat(50));
if (failed > 0) {
  console.log('\n  VERDICT: REJECT\n');
  process.exit(1);
} else {
  console.log('\n  VERDICT: APPROVE\n');
}
