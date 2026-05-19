'use strict';

/**
 * Regression guard: FAQ must not promise template/tone customization.
 * UC: uc-buyer-journey-customization-promise
 * Acceptance: grep "customize the tone and templates" app/page.tsx → 0
 *
 * The templates table is empty and no customization UI exists. Promising it
 * is a false claim. This test prevents re-introduction of the promise.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PAGE_PATH = path.resolve(__dirname, '../../product/lead-response/dashboard/app/page.tsx');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

console.log('=== UC: buyer-journey-customization-promise Tests ===\n');

if (!fs.existsSync(PAGE_PATH)) {
  console.error(`FATAL: page.tsx not found at ${PAGE_PATH}`);
  process.exit(1);
}

const content = fs.readFileSync(PAGE_PATH, 'utf8');

test('FAQ does not promise template/tone customization', () => {
  assert.ok(
    !content.includes('customize the tone and templates'),
    'page.tsx must not contain "customize the tone and templates" — no customization UI exists'
  );
});

test('FAQ answer for robot question is present and accurate', () => {
  assert.ok(
    content.includes('The AI is trained to sound like a professional agent'),
    'FAQ answer for "does it sound like a robot?" must be present'
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
