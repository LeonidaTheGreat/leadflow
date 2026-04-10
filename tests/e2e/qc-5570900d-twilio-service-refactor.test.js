/**
 * QC E2E Test — PR #1108
 * Task: 5570900d-f000-4fce-be7b-96604c1e3b8c
 * Verifies: TwilioService class refactor is complete and correct
 */

'use strict';

const assert = require('assert');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    failed++;
  }
}

// --- Test 1: Old file deleted ---
test('old lib/twilio-sms.js is deleted', () => {
  const fs = require('fs');
  const oldPath = path.join(__dirname, '..', '..', 'lib', 'twilio-sms.js');
  assert.ok(!fs.existsSync(oldPath), `Old file still exists: ${oldPath}`);
});

// --- Test 2: New TwilioService file exists ---
test('new lib/services/TwilioService.js exists', () => {
  const fs = require('fs');
  const newPath = path.join(__dirname, '..', '..', 'lib', 'services', 'TwilioService.js');
  assert.ok(fs.existsSync(newPath), `New TwilioService not found: ${newPath}`);
});

// --- Test 3: TwilioService is a class ---
const TwilioService = require('../../lib/services/TwilioService');
test('TwilioService is a constructor/class', () => {
  assert.strictEqual(typeof TwilioService, 'function');
  assert.ok(TwilioService.prototype.sendSms, 'sendSms method missing');
  assert.ok(TwilioService.prototype.validateSmsInput, 'validateSmsInput method missing');
  assert.ok(TwilioService.prototype.selectFromNumber, 'selectFromNumber method missing');
  assert.ok(TwilioService.prototype.resolveTwilioContext, 'resolveTwilioContext method missing');
  assert.ok(TwilioService.prototype.truncateMessage, 'truncateMessage method missing');
});

// --- Test 4: Instantiates without error ---
test('TwilioService instantiates with mock db', () => {
  const mockDb = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  };
  const svc = new TwilioService({ db: mockDb });
  assert.ok(svc instanceof TwilioService);
  assert.ok(svc.smsConfig, 'smsConfig not initialized');
});

// --- Test 5: Backward-compat named exports ---
test('backward-compat exports present on module', () => {
  assert.strictEqual(typeof TwilioService.classifyTwilioError, 'function', 'classifyTwilioError static not exported');
  assert.strictEqual(typeof TwilioService.isA2pBlockedError, 'function', 'isA2pBlockedError static not exported');
  assert.ok(TwilioService.TwilioErrorCodes, 'TwilioErrorCodes not exported');
  assert.ok(TwilioService.DeliveryStatus, 'DeliveryStatus not exported');
  // Module-level named export compatibility
  assert.strictEqual(typeof TwilioService.sendSmsViatwilio, 'function', 'sendSmsViatwilio named export missing');
  assert.strictEqual(typeof TwilioService.validateSmsInput, 'function', 'validateSmsInput named export missing');
  assert.strictEqual(typeof TwilioService.selectFromNumber, 'function', 'selectFromNumber named export missing');
});

// --- Test 6: FUBService uses TwilioService ---
test('FUBService imports TwilioService not twilio-sms', () => {
  const fs = require('fs');
  const fubContent = fs.readFileSync(path.join(__dirname, '../../lib/services/FUBService.js'), 'utf8');
  assert.ok(!fubContent.includes("require('../twilio-sms')"), 'FUBService still imports twilio-sms');
  assert.ok(fubContent.includes("require('./TwilioService')"), 'FUBService does not import TwilioService');
});

// --- Test 7: validateSmsInput throws on invalid input ---
test('validateSmsInput throws on empty phone', () => {
  const svc = new TwilioService();
  assert.throws(() => svc.validateSmsInput('', 'hello'), /required/);
});

test('validateSmsInput throws on invalid E.164', () => {
  const svc = new TwilioService();
  assert.throws(() => svc.validateSmsInput('5551234', 'hello'), /E\.164/);
});

test('validateSmsInput throws on empty message', () => {
  const svc = new TwilioService();
  assert.throws(() => svc.validateSmsInput('+14165551234', ''), /required/);
});

// --- Test 8: truncateMessage respects maxLength ---
test('truncateMessage truncates long messages', () => {
  const svc = new TwilioService();
  const long = 'x'.repeat(200);
  const result = svc.truncateMessage(long);
  assert.ok(result.length <= 160, `truncateMessage returned ${result.length} chars`);
  assert.ok(result.endsWith('...'));
});

test('truncateMessage passes short messages unchanged', () => {
  const svc = new TwilioService();
  const short = 'Hello world. Reply STOP to opt out.';
  assert.strictEqual(svc.truncateMessage(short), short);
});

// --- Test 9: classifyTwilioError works correctly ---
test('classifyTwilioError classifies A2P errors', () => {
  const { classifyTwilioError } = TwilioService;
  const result = classifyTwilioError({ code: 30034, message: 'carrier filtered' });
  assert.strictEqual(result.category, 'A2P_BLOCKED');
  assert.strictEqual(result.retryable, false);
});

test('classifyTwilioError classifies rate limit as retryable', () => {
  const { classifyTwilioError } = TwilioService;
  const result = classifyTwilioError({ code: 20429, message: 'rate limit' });
  assert.strictEqual(result.category, 'RATE_LIMIT');
  assert.strictEqual(result.retryable, true);
});

// --- Test 10: A2P test can use TwilioService exports ---
test('A2P test exports available via TwilioService (not twilio-sms.js)', () => {
  // The old fix-a2p-10dlc test imports from lib/twilio-sms.js which is deleted.
  // These exports must be available from TwilioService.
  assert.ok(TwilioService.isA2pBlockedError, 'isA2pBlockedError missing');
  assert.ok(TwilioService.TwilioErrorCodes.A2P_CARRIER_FILTERED, 'A2P_CARRIER_FILTERED code missing');
  assert.ok(TwilioService.A2P_ERROR_CODE_SET instanceof Set, 'A2P_ERROR_CODE_SET not a Set');
});

// --- Test 11: module-level sendSmsViatwilio backward compat ---
test('module.sendSmsViatwilio is a function (backward compat)', () => {
  const mod = require('../../lib/services/TwilioService');
  assert.strictEqual(typeof mod.sendSmsViatwilio, 'function');
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`QC E2E — TwilioService Refactor (PR #1108)`);
console.log(`${'='.repeat(50)}`);
console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
console.log(`Pass rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed > 0) {
  process.exitCode = 1;
}
