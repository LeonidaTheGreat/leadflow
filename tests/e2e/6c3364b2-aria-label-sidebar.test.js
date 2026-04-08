'use strict';
/**
 * E2E test for PR #1050 — aria-label on dashboard sidebar nav links
 * UC: 6c3364b2 — Add aria-label to dashboard sidebar navigation links
 *
 * This test verifies that dashboard-nav.tsx contains aria-label attributes
 * on its navigation links. The PR only added a test file with no implementation,
 * so this test is expected to FAIL against the PR branch — confirming rejection.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const NAV_FILE = path.join(
  __dirname,
  '../../product/lead-response/dashboard/app/dashboard/dashboard-nav.tsx'
);

const src = fs.readFileSync(NAV_FILE, 'utf8');

// The acceptance criterion: nav links must carry descriptive aria-labels.
const EXPECTED_LABELS = [
  'Go to dashboard home',
  'Go to lead feed',
  'Go to lead history',
  'Go to dashboard analytics',
  'Go to lead response simulator',
  'Go to settings',
];

let passed = 0;
let failed = 0;

for (const label of EXPECTED_LABELS) {
  const present = src.includes(`aria-label="${label}"`);
  if (present) {
    console.log(`  PASS  aria-label="${label}" found`);
    passed++;
  } else {
    console.error(`  FAIL  aria-label="${label}" NOT FOUND in dashboard-nav.tsx`);
    failed++;
  }
}

console.log(`\nResults: ${passed}/${EXPECTED_LABELS.length} aria-labels present`);

assert.strictEqual(
  failed,
  0,
  `${failed} aria-label(s) missing from dashboard-nav.tsx — implementation was not shipped`
);

console.log('\nAll aria-labels verified.');
