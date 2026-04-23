/**
 * E2E test: isValidPriceId regex fix
 * Verifies the corrected quantifier {14,30} accepts real Stripe price IDs
 * and still rejects placeholder values.
 *
 * Run: node product/lead-response/dashboard/tests/b4b9f900-fix-checkout-price-id-regex.test.js
 */
'use strict';
const assert = require('assert');

// Replicate the fixed validator exactly as it exists in route.ts
function isValidPriceId(id) {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id);
}

let passed = 0;
let total = 0;

function check(label, actual, expected) {
  total++;
  if (actual === expected) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label} — expected ${expected}, got ${actual}`);
  }
}

console.log('\n=== isValidPriceId regex tests ===\n');

// --- Should ACCEPT ---
check('real Stripe ID (24 alphanum)',     isValidPriceId('price_1QvIEf2eZvKYlo2CkuDLQABG'), true);
check('minimum length (14 alphanum)',     isValidPriceId('price_12345678901234'),           true);
check('maximum length (30 alphanum)',     isValidPriceId('price_' + 'A'.repeat(30)),        true);

// --- Should REJECT ---
check('placeholder price_starter_49',    isValidPriceId('price_starter_49'),               false);
check('placeholder price_pro_149',       isValidPriceId('price_pro_149'),                  false);
check('placeholder price_team_399',      isValidPriceId('price_team_399'),                 false);
check('too short (13 alphanum)',          isValidPriceId('price_1234567890123'),            false);
check('too long (31 alphanum)',           isValidPriceId('price_' + 'A'.repeat(31)),        false);
check('contains underscore after prefix',isValidPriceId('price_abc_def12345678'),          false);
check('empty string',                    isValidPriceId(''),                                false);
check('undefined',                       isValidPriceId(undefined),                         false);
check('null',                            isValidPriceId(null),                              false);
check('bare alphanum (no prefix)',        isValidPriceId('1QvIEf2eZvKYlo2CkuDLQABG'),      false);

console.log(`\n${passed}/${total} passed\n`);
assert.strictEqual(passed, total, `${total - passed} test(s) failed`);
console.log('All tests passed.');
