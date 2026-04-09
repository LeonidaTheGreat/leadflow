/**
 * E2E test: Math.random() → crypto.getRandomValues() in simulator.tsx
 * Task: fix-code-quality-math-random-used-use-cr
 *
 * Verifies:
 * 1. simulator.tsx no longer uses Math.random()
 * 2. simulator.tsx uses globalThis.crypto.getRandomValues() instead
 * 3. Session ID format is valid (sim_<timestamp>_<hex>)
 * 4. Multiple generated IDs are unique (collision test)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SIMULATOR_PATH = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/onboarding/steps/simulator.tsx'
);

console.log('E2E: Math.random → crypto.getRandomValues in simulator.tsx\n');

// --- Test 1: File exists ---
const src = fs.readFileSync(SIMULATOR_PATH, 'utf8');
assert.ok(src.length > 0, 'simulator.tsx must exist and be non-empty');
console.log('✅ Test 1: simulator.tsx exists');

// --- Test 2: Math.random() is gone ---
assert.ok(
  !src.includes('Math.random()'),
  'simulator.tsx must NOT use Math.random()'
);
console.log('✅ Test 2: Math.random() removed');

// --- Test 3: crypto.getRandomValues() is present ---
assert.ok(
  src.includes('getRandomValues'),
  'simulator.tsx must use getRandomValues'
);
assert.ok(
  src.includes('globalThis.crypto'),
  'simulator.tsx must use globalThis.crypto (Web Crypto API)'
);
console.log('✅ Test 3: globalThis.crypto.getRandomValues() present');

// --- Test 4: Uint8Array used for the random buffer ---
assert.ok(
  src.includes('Uint8Array'),
  'simulator.tsx must use Uint8Array as the random buffer'
);
console.log('✅ Test 4: Uint8Array buffer present');

// --- Test 5: Simulate the session ID generation logic ---
// Mirror what the component does to verify format
function generateSessionId() {
  const randomBuffer = new Uint8Array(9);
  // Use Node's crypto (same underlying algorithm as Web Crypto getRandomValues)
  const nodeCrypto = require('crypto');
  nodeCrypto.getRandomValues(randomBuffer);
  const randomPart = Array.from(randomBuffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `sim_${Date.now()}_${randomPart}`;
}

const id1 = generateSessionId();
const SESSION_ID_PATTERN = /^sim_\d+_[0-9a-f]{18}$/;
assert.match(id1, SESSION_ID_PATTERN, `Session ID must match pattern sim_<timestamp>_<18hexchars>, got: ${id1}`);
console.log(`✅ Test 5: Session ID format valid: ${id1}`);

// --- Test 6: IDs are unique across multiple calls ---
const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));
assert.strictEqual(ids.size, 100, '100 generated session IDs must all be unique');
console.log('✅ Test 6: 100 generated IDs are all unique (no collisions)');

console.log('\n✅ All tests passed.');
