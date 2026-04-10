'use strict';

/**
 * E2E test for PR #1114 — TwilioService class refactor
 * Task: 299d9914-5d5e-4474-9000-d0e58939f274
 *
 * Verifies:
 * 1. TwilioService can be required and instantiated
 * 2. TwilioService exposes the correct public API
 * 3. lib/twilio-sms.js shim delegates correctly to TwilioService
 * 4. FUBService.js no longer requires from ../twilio-sms (uses TwilioService directly)
 * 5. Static backward-compat exports on TwilioService are correct
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n🔍 PR #1114 — TwilioService Refactor QC Tests\n');

// 1. TwilioService can be required without MODULE_NOT_FOUND
console.log('--- TwilioService imports ---');

let TwilioService;
test('TwilioService requires without error', () => {
  TwilioService = require(path.join(ROOT, 'lib/services/TwilioService'));
  assert.ok(TwilioService, 'module must export a value');
});

test('TwilioService is a class constructor', () => {
  assert.strictEqual(typeof TwilioService, 'function', 'should export a class');
});

test('TwilioService can be instantiated (no env required)', () => {
  const instance = new TwilioService({ db: null });
  assert.ok(instance, 'must instantiate');
});

// 2. TwilioService instance exposes required public API
console.log('\n--- TwilioService public API ---');

test('TwilioService instance has sendSms method', () => {
  const svc = new TwilioService({ db: null });
  assert.strictEqual(typeof svc.sendSms, 'function');
});

test('TwilioService instance has updateSmsStatus method', () => {
  const svc = new TwilioService({ db: null });
  assert.strictEqual(typeof svc.updateSmsStatus, 'function');
});

test('TwilioService instance has getSmsStatus method', () => {
  const svc = new TwilioService({ db: null });
  assert.strictEqual(typeof svc.getSmsStatus, 'function');
});

test('TwilioService instance has getSmsHistoryForLead method', () => {
  const svc = new TwilioService({ db: null });
  assert.strictEqual(typeof svc.getSmsHistoryForLead, 'function');
});

test('TwilioService instance has getSmsAnalytics method', () => {
  const svc = new TwilioService({ db: null });
  assert.strictEqual(typeof svc.getSmsAnalytics, 'function');
});

test('TwilioService instance has resolveTwilioContext method', () => {
  const svc = new TwilioService({ db: null });
  assert.strictEqual(typeof svc.resolveTwilioContext, 'function');
});

test('TwilioService instance has validateSmsInput method', () => {
  const svc = new TwilioService({ db: null });
  assert.strictEqual(typeof svc.validateSmsInput, 'function');
});

test('TwilioService instance has selectFromNumber method', () => {
  const svc = new TwilioService({ db: null });
  assert.strictEqual(typeof svc.selectFromNumber, 'function');
});

test('TwilioService instance has truncateMessage method', () => {
  const svc = new TwilioService({ db: null });
  assert.strictEqual(typeof svc.truncateMessage, 'function');
});

// 3. Static backward-compat exports
console.log('\n--- Static exports ---');

test('TwilioService.DeliveryStatus is an object', () => {
  assert.strictEqual(typeof TwilioService.DeliveryStatus, 'object');
  assert.ok(TwilioService.DeliveryStatus.DELIVERED, 'must have DELIVERED key');
});

test('TwilioService.TwilioErrorCodes is an object', () => {
  assert.strictEqual(typeof TwilioService.TwilioErrorCodes, 'object');
  assert.ok(TwilioService.TwilioErrorCodes.INVALID_TO_NUMBER);
});

test('TwilioService.classifyTwilioError is a function', () => {
  assert.strictEqual(typeof TwilioService.classifyTwilioError, 'function');
});

test('TwilioService.isA2pBlockedError is a function', () => {
  assert.strictEqual(typeof TwilioService.isA2pBlockedError, 'function');
});

// 4. Core logic correctness (unit tests without network)
console.log('\n--- Core logic correctness ---');

test('validateSmsInput accepts valid E.164 number', () => {
  const svc = new TwilioService({ db: null });
  // Should not throw
  svc.validateSmsInput('+14165551234', 'Hello, reply STOP to opt out');
});

test('validateSmsInput rejects missing phone', () => {
  const svc = new TwilioService({ db: null });
  assert.throws(() => svc.validateSmsInput(null, 'text'), /required/i);
});

test('validateSmsInput rejects non-E164 phone', () => {
  const svc = new TwilioService({ db: null });
  assert.throws(() => svc.validateSmsInput('5551234', 'text'), /E\.164/i);
});

test('validateSmsInput rejects empty message', () => {
  const svc = new TwilioService({ db: null });
  assert.throws(() => svc.validateSmsInput('+14165551234', ''), /required/i);
});

test('truncateMessage leaves short messages intact', () => {
  const svc = new TwilioService({ db: null });
  const msg = 'Hello! Reply STOP to opt out.';
  assert.strictEqual(svc.truncateMessage(msg), msg);
});

test('truncateMessage truncates long messages at 160 chars', () => {
  const svc = new TwilioService({ db: null });
  const long = 'A'.repeat(200);
  const result = svc.truncateMessage(long);
  assert.strictEqual(result.length, 160);
  assert.ok(result.endsWith('...'));
});

test('classifyTwilioError handles A2P error code 30034', () => {
  const err = { code: 30034, message: 'carrier filtered' };
  const result = TwilioService.classifyTwilioError(err);
  assert.strictEqual(result.category, 'A2P_BLOCKED');
  assert.strictEqual(result.retryable, false);
});

test('classifyTwilioError marks rate limit as retryable', () => {
  const err = { code: 20429, message: 'rate limit' };
  const result = TwilioService.classifyTwilioError(err);
  assert.strictEqual(result.category, 'RATE_LIMIT');
  assert.strictEqual(result.retryable, true);
});

// 5. Shim backward compat
console.log('\n--- lib/twilio-sms.js shim ---');

let shim;
test('lib/twilio-sms.js requires without error', () => {
  shim = require(path.join(ROOT, 'lib/twilio-sms'));
  assert.ok(shim);
});

test('shim exports sendSmsViatwilio function', () => {
  assert.strictEqual(typeof shim.sendSmsViatwilio, 'function');
});

test('shim exports DeliveryStatus', () => {
  assert.ok(shim.DeliveryStatus && shim.DeliveryStatus.DELIVERED);
});

test('shim exports TwilioErrorCodes', () => {
  assert.ok(shim.TwilioErrorCodes && shim.TwilioErrorCodes.INVALID_TO_NUMBER);
});

test('shim exports SMS_CONFIG with phoneNumbers', () => {
  assert.ok(shim.SMS_CONFIG, 'SMS_CONFIG must exist');
  assert.strictEqual(typeof shim.SMS_CONFIG.maxMessageLength, 'number');
});

// 6. FUBService wiring
console.log('\n--- FUBService wiring ---');

test('FUBService.js imports TwilioService (not twilio-sms)', () => {
  const content = fs.readFileSync(path.join(ROOT, 'lib/services/FUBService.js'), 'utf8');
  assert.ok(content.includes("require('./TwilioService')"), 'must use TwilioService');
  assert.ok(!content.includes("require('../twilio-sms')"), 'must NOT use legacy twilio-sms import');
});

// 7. Orphaned test files check (these should NOT be in this PR)
console.log('\n--- Orphaned test files check ---');

test('test file 0ce1782b is for PR #1101 (different PR — orphaned)', () => {
  const testPath = path.join(ROOT, 'tests/e2e/0ce1782b-deployment-drift-service-wiring.test.js');
  if (fs.existsSync(testPath)) {
    const content = fs.readFileSync(testPath, 'utf8');
    const referencesOtherPR = content.includes('PR #1101');
    assert.ok(referencesOtherPR, 'confirm this test belongs to a different PR');
    console.log('    ⚠️  This test file references PR #1101, not PR #1114');
  } else {
    assert.fail('Expected orphaned test file does not exist — good if removed');
  }
  passed--; // Don't count this as a pass — it's a flag, not a success
  failed++;
});

test('qc-87158bab test is from a different task (orphaned)', () => {
  const testPath = path.join(ROOT, 'tests/qc-87158bab-e2e-flow-fix.test.js');
  if (fs.existsSync(testPath)) {
    console.log('    ⚠️  tests/qc-87158bab-e2e-flow-fix.test.js belongs to a prior QC task, not PR #1114');
    passed--;
    failed++;
  }
});

test('qc-pr1088 test references a different PR (orphaned)', () => {
  const testPath = path.join(ROOT, 'tests/qc-pr1088-deployment-drift-db-consolidation.test.js');
  if (fs.existsSync(testPath)) {
    console.log('    ⚠️  tests/qc-pr1088-deployment-drift-db-consolidation.test.js belongs to PR #1088, not PR #1114');
    passed--;
    failed++;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) {
  console.log('\n❌ PR #1114 has issues — see above for details.');
} else {
  console.log('\n✅ All checks passed.');
}
console.log('='.repeat(60) + '\n');
