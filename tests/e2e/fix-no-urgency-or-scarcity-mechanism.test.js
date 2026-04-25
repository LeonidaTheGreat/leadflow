/**
 * E2E Test: Urgency / Scarcity Mechanism on Landing Page
 * UC: fix-no-urgency-or-scarcity-mechanism
 * Task: 14e80f40-b29b-4d44-887d-12d48afa382a
 *
 * Verifies that the Next.js landing page has an urgency banner equivalent
 * to the HTML prototype urgency banner (limited pilot spots + pricing lock-in).
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

console.log('=== Urgency / Scarcity Mechanism Tests ===\n');

if (!fs.existsSync(PAGE_PATH)) {
  console.error(`FATAL: page.tsx not found at ${PAGE_PATH}`);
  process.exit(1);
}

const content = fs.readFileSync(PAGE_PATH, 'utf8');

test('URGENCY: urgency-banner data-testid is present', () => {
  assert.ok(
    content.includes('data-testid="urgency-banner"'),
    'Landing page must have an element with data-testid="urgency-banner"'
  );
});

test('URGENCY: Banner mentions limited pilot spots', () => {
  const bannerIdx = content.indexOf('data-testid="urgency-banner"');
  assert.ok(bannerIdx !== -1, 'urgency-banner element must exist');
  const bannerRegion = content.slice(bannerIdx - 200, bannerIdx + 500);
  assert.ok(
    bannerRegion.toLowerCase().includes('pilot'),
    'Urgency banner must reference pilot spots'
  );
  assert.ok(
    bannerRegion.toLowerCase().includes('limited') || bannerRegion.toLowerCase().includes('spots'),
    'Urgency banner must convey scarcity (limited spots or similar)'
  );
});

test('URGENCY: Banner mentions pricing incentive (lock-in or discount)', () => {
  const bannerIdx = content.indexOf('data-testid="urgency-banner"');
  const bannerRegion = content.slice(bannerIdx - 200, bannerIdx + 500);
  assert.ok(
    bannerRegion.includes('pricing') || bannerRegion.includes('%') || bannerRegion.includes('discount'),
    'Urgency banner must mention a pricing incentive'
  );
});

test('URGENCY: Banner links to pilot signup page', () => {
  const bannerIdx = content.indexOf('data-testid="urgency-banner"');
  const bannerRegion = content.slice(bannerIdx - 200, bannerIdx + 500);
  assert.ok(
    bannerRegion.includes('href="/pilot"') || bannerRegion.includes('href="/pilot-signup"'),
    'Urgency banner must link to /pilot or /pilot-signup'
  );
});

test('URGENCY: Banner appears before the main header (FOMO trigger is first thing seen)', () => {
  const bannerIdx = content.indexOf('data-testid="urgency-banner"');
  const headerIdx = content.indexOf('data-testid="nav"');
  assert.ok(bannerIdx !== -1, 'urgency-banner must exist');
  assert.ok(headerIdx !== -1, 'nav must exist');
  assert.ok(
    bannerIdx < headerIdx,
    'Urgency banner must appear in DOM before the navigation header'
  );
});

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed / ${passed + failed} total ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed.');
}
