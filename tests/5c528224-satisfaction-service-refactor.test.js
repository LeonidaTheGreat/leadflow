'use strict';

/**
 * E2E test for task 5c528224 — SatisfactionService class refactor
 * Verifies:
 * 1. New SatisfactionService class exports correctly
 * 2. Backward-compat shim delegates to class instance
 * 3. FUBService imports from new class path
 * 4. classifyReply logic preserved
 * 5. Constructor accepts injected dependencies
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;
const total = 8;

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

// Test 1: SatisfactionService class loads and has expected methods
test('SatisfactionService class loads with expected methods', () => {
  const SatisfactionService = require('../lib/services/SatisfactionService');
  assert.strictEqual(typeof SatisfactionService, 'function', 'Should export a class/constructor');
  const instance = new SatisfactionService({ db: {}, logger: { log() {}, error() {} } });
  assert.strictEqual(typeof instance.sendSatisfactionPing, 'function');
  assert.strictEqual(typeof instance.scheduleSatisfactionPing, 'function');
  assert.strictEqual(typeof instance.getPendingSatisfactionPing, 'function');
  assert.strictEqual(typeof instance.classifyReply, 'function');
  assert.strictEqual(typeof instance.recordSatisfactionReply, 'function');
});

// Test 2: Backward-compat shim exports the same function names
test('Backward-compat shim exports expected function names', () => {
  const shim = require('../lib/satisfaction-service');
  assert.strictEqual(typeof shim.sendSatisfactionPing, 'function');
  assert.strictEqual(typeof shim.scheduleSatisfactionPing, 'function');
  assert.strictEqual(typeof shim.getPendingSatisfactionPing, 'function');
  assert.strictEqual(typeof shim.classifyReply, 'function');
  assert.strictEqual(typeof shim.recordSatisfactionReply, 'function');
  assert.strictEqual(typeof shim.SATISFACTION_PING_MESSAGE, 'string');
  assert.strictEqual(typeof shim.SATISFACTION_COOLDOWN_MS, 'number');
});

// Test 3: classifyReply — positive keywords
test('classifyReply classifies positive keywords', () => {
  const SatisfactionService = require('../lib/services/SatisfactionService');
  const svc = new SatisfactionService({ db: {}, logger: { log() {}, error() {} } });
  assert.strictEqual(svc.classifyReply('yes'), 'positive');
  assert.strictEqual(svc.classifyReply('YES'), 'positive');
  assert.strictEqual(svc.classifyReply('thanks'), 'positive');
  assert.strictEqual(svc.classifyReply('great job'), 'positive');
  assert.strictEqual(svc.classifyReply('  awesome  '), 'positive');
});

// Test 4: classifyReply — negative keywords
test('classifyReply classifies negative keywords', () => {
  const SatisfactionService = require('../lib/services/SatisfactionService');
  const svc = new SatisfactionService({ db: {}, logger: { log() {}, error() {} } });
  assert.strictEqual(svc.classifyReply('no'), 'negative');
  assert.strictEqual(svc.classifyReply('NO'), 'negative');
  assert.strictEqual(svc.classifyReply('bad experience'), 'negative');
  assert.strictEqual(svc.classifyReply('terrible'), 'negative');
});

// Test 5: classifyReply — neutral and unclassified
test('classifyReply handles neutral and unclassified', () => {
  const SatisfactionService = require('../lib/services/SatisfactionService');
  const svc = new SatisfactionService({ db: {}, logger: { log() {}, error() {} } });
  assert.strictEqual(svc.classifyReply('ok'), 'neutral');
  assert.strictEqual(svc.classifyReply('fine'), 'neutral');
  assert.strictEqual(svc.classifyReply('random stuff'), 'unclassified');
  assert.strictEqual(svc.classifyReply('maybe later'), 'unclassified');
});

// Test 6: shim classifyReply matches class classifyReply
test('Shim classifyReply delegates to class correctly', () => {
  const shim = require('../lib/satisfaction-service');
  assert.strictEqual(shim.classifyReply('yes'), 'positive');
  assert.strictEqual(shim.classifyReply('no'), 'negative');
  assert.strictEqual(shim.classifyReply('ok'), 'neutral');
  assert.strictEqual(shim.classifyReply('xyz'), 'unclassified');
});

// Test 7: Constructor accepts injected db and logger
test('Constructor accepts injected dependencies', () => {
  const SatisfactionService = require('../lib/services/SatisfactionService');
  const fakeDb = { from: () => {} };
  const fakeLogger = { log() {}, error() {} };
  const svc = new SatisfactionService({ db: fakeDb, logger: fakeLogger });
  assert.strictEqual(svc.db, fakeDb);
  assert.strictEqual(svc.logger, fakeLogger);
});

// Test 8: FUBService imports SatisfactionService from new path
test('FUBService imports SatisfactionService from class path', () => {
  const fubSrc = fs.readFileSync(
    path.join(__dirname, '..', 'lib', 'services', 'FUBService.js'),
    'utf8'
  );
  assert.ok(
    fubSrc.includes("require('./SatisfactionService')"),
    'FUBService should import from ./SatisfactionService'
  );
  assert.ok(
    !fubSrc.includes("require('../satisfaction-service')"),
    'FUBService should NOT import from old path'
  );
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}`);
process.exit(failed > 0 ? 1 : 0);
