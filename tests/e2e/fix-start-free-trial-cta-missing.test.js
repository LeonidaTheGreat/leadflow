/**
 * E2E Test: fix-start-free-trial-cta-missing-from-landing-page-3-p
 * Verifies 3 "Start Free Trial" CTA placements on the landing page
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PAGE_PATH = path.join(__dirname, '../product/lead-response/dashboard/app/page.tsx');

console.log('=== E2E Test: Start Free Trial CTA — 3 Placements ===\n');

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

const content = fs.readFileSync(PAGE_PATH, 'utf8');

// Placement #1: Hero — TrialSignupForm compact
test('CTA Placement #1: Hero section has TrialSignupForm compact', () => {
  assert.ok(content.includes('<TrialSignupForm compact'), 'Hero section must have <TrialSignupForm compact');
});

// Placement #2: End of Features section — link to /signup/trial
test('CTA Placement #2: Features section has "Start Free Trial" link to /signup/trial', () => {
  assert.ok(content.includes('CTA Placement #2') || content.includes('End of Features'), 
    'Features CTA comment must be present');
  const featuresCTARegex = /href="\/signup\/trial"[\s\S]{0,300}Start Free Trial/;
  assert.ok(
    featuresCTARegex.test(content),
    'Features CTA must link to /signup/trial with "Start Free Trial" text'
  );
});

// Placement #3: Pricing section — "or start free trial →" link to /signup/trial  
test('CTA Placement #3: Pricing section has "or start free trial" link to /signup/trial', () => {
  assert.ok(content.includes('CTA Placement #3') || content.includes('Pricing'), 
    'Pricing CTA comment must be present');
  assert.ok(content.includes('or start free trial'), 'Pricing section must have "or start free trial" text');
  const pricingTrialRegex = /href="\/signup\/trial"[\s\S]{0,200}or start free trial/;
  assert.ok(
    pricingTrialRegex.test(content),
    'Pricing "or start free trial" must link to /signup/trial'
  );
});

// No old /signup?mode=trial URLs remain
test('No stale /signup?mode=trial CTAs remain (all migrated to /signup/trial)', () => {
  const oldCTACount = (content.match(/href="\/signup\?mode=trial"/g) || []).length;
  assert.strictEqual(oldCTACount, 0, 
    `Found ${oldCTACount} stale href="/signup?mode=trial" — should be 0`);
});

// TrialSignupForm is imported
test('TrialSignupForm component is imported', () => {
  assert.ok(content.includes("import TrialSignupForm from '@/components/trial-signup-form'"),
    'TrialSignupForm must be imported');
});

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
}
