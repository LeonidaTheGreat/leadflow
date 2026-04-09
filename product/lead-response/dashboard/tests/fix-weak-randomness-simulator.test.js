/**
 * E2E Test: Fix weak_randomness in simulator.tsx
 * Task: 9d915171-0424-4a12-b5da-837b5f7970ea
 *
 * Verifies that simulator.tsx no longer uses Math.random() for session ID
 * generation and instead uses globalThis.crypto.getRandomValues() which is
 * cryptographically secure.
 *
 * Run: node product/lead-response/dashboard/tests/fix-weak-randomness-simulator.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SIMULATOR_PATH = path.join(
  __dirname,
  '../app/onboarding/steps/simulator.tsx'
);

const source = fs.readFileSync(SIMULATOR_PATH, 'utf8');

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

// ── Tests ──────────────────────────────────────────────────────────────────

test('Math.random() is not used for session ID generation', () => {
  // Find the useEffect that sets sessionId
  const sessionIdBlock = source.match(/useEffect\(\(\) => \{[\s\S]*?setSessionId[\s\S]*?\}, \[\]\)/);
  assert.ok(sessionIdBlock, 'Could not locate sessionId useEffect block');
  assert.ok(
    !sessionIdBlock[0].includes('Math.random()'),
    'Math.random() is still used in session ID generation — should use crypto.getRandomValues()'
  );
});

test('globalThis.crypto.getRandomValues() is used for session ID', () => {
  const sessionIdBlock = source.match(/useEffect\(\(\) => \{[\s\S]*?setSessionId[\s\S]*?\}, \[\]\)/);
  assert.ok(sessionIdBlock, 'Could not locate sessionId useEffect block');
  assert.ok(
    sessionIdBlock[0].includes('globalThis.crypto.getRandomValues'),
    'Expected globalThis.crypto.getRandomValues() in session ID useEffect'
  );
});

test('randomBuffer is Uint8Array (typed array for getRandomValues)', () => {
  assert.ok(
    source.includes('new Uint8Array(9)'),
    'Expected new Uint8Array(9) for randomBuffer'
  );
});

test('Session ID format includes timestamp prefix', () => {
  assert.ok(
    source.includes('`sim_${Date.now()}_'),
    'Session ID should start with sim_ and include timestamp for traceability'
  );
});

test('No bare Math.random() anywhere in simulator.tsx', () => {
  const occurrences = (source.match(/Math\.random\(\)/g) || []).length;
  assert.strictEqual(
    occurrences,
    0,
    `Found ${occurrences} Math.random() call(s) in simulator.tsx — all must be replaced`
  );
});

// ── Summary ────────────────────────────────────────────────────────────────

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
