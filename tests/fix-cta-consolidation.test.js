/**
 * E2E Test: Landing Page CTA Consolidation
 * Verifies the consolidation of duplicate "Free" CTAs on the landing page
 * per PRD-LANDING-CTA-CONSOLIDATION-001
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PAGE_PATH = path.join(__dirname, '../product/lead-response/dashboard/app/page.tsx');
const PRICING_PATH = path.join(__dirname, '../product/lead-response/dashboard/components/PricingSection.tsx');

console.log('=== E2E Test: Landing Page CTA Consolidation ===\n');

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

const pageContent = fs.readFileSync(PAGE_PATH, 'utf8');
const pricingContent = fs.readFileSync(PRICING_PATH, 'utf8');

// FR-1: Primary CTA Update
test('FR-1: Hero has single primary CTA "Start Free Trial — No Credit Card Required"', () => {
  assert.ok(
    pageContent.includes('Start Free Trial — No Credit Card Required'),
    'Hero must have primary CTA with exact text'
  );
  assert.ok(
    pageContent.includes('href="/signup/trial"'),
    'Primary CTA must link to /signup/trial'
  );
  assert.ok(
    pageContent.includes("start_free_trial_hero"),
    'Primary CTA must have correct tracking ID'
  );
});

// FR-2: Secondary Pilot Program Link
test('FR-2: Secondary link "Apply for Structured Pilot Program" exists', () => {
  assert.ok(
    pageContent.includes('apply for our Structured Pilot Program'),
    'Secondary link must have correct text'
  );
  assert.ok(
    pageContent.includes("pilot_program_secondary"),
    'Secondary link must have correct tracking ID'
  );
});

// FR-3: Remove Conflicting CTAs
test('FR-3: Old "Join the Pilot — It\'s Free" CTA is removed', () => {
  assert.ok(
    !pageContent.includes("Join the Pilot — It's Free"),
    'Old "Join the Pilot — It\'s Free" CTA must be removed'
  );
  assert.ok(
    !pageContent.includes("join_pilot_hero"),
    'Old join_pilot_hero tracking ID must be removed'
  );
});

test('FR-3: Old "Get Started Free" CTA is removed', () => {
  assert.ok(
    !pageContent.includes('Get Started Free'),
    'Old "Get Started Free" CTA must be removed'
  );
  assert.ok(
    !pageContent.includes('get_started_hero'),
    'Old get_started_hero tracking ID must be removed'
  );
});

// FR-4: Navigation CTA Update
test('FR-4: Navigation CTA updated to "Start Free Trial"', () => {
  assert.ok(
    pageContent.includes('Start Free Trial'),
    'Nav CTA text must be "Start Free Trial"'
  );
  assert.ok(
    !pageContent.includes('Join Free Pilot'),
    'Old "Join Free Pilot" nav CTA must be removed'
  );
  assert.ok(
    pageContent.includes("start_free_trial_nav"),
    'Nav CTA must have correct tracking ID'
  );
});

// FR-6: Pricing Section CTA Consistency
test('FR-6: Pricing section CTAs link to /signup/trial', () => {
  // Check that pricing section has Start Free Trial CTAs
  // The PricingSection uses a single Link component inside a map, so we check
  // that it links to /signup/trial and shows "Start Free Trial" text
  assert.ok(
    pricingContent.includes('href="/signup/trial"'),
    'Pricing section must link to /signup/trial'
  );
  assert.ok(
    pricingContent.includes('Start Free Trial'),
    'Pricing section must display "Start Free Trial" text'
  );
});

// GA4 Tracking Verification
test('GA4: All CTAs have proper tracking attributes', () => {
  // Primary CTA
  assert.ok(
    pageContent.includes('data-cta-id="start_free_trial_hero"'),
    'Primary CTA must have data-cta-id attribute'
  );
  // Secondary link
  assert.ok(
    pageContent.includes('data-cta-id="pilot_program_secondary"'),
    'Secondary link must have data-cta-id attribute'
  );
  // Nav CTA
  assert.ok(
    pageContent.includes('data-cta-id="start_free_trial_nav"'),
    'Nav CTA must have data-cta-id attribute'
  );
});

// Mobile Responsiveness
test('Mobile: Primary CTA uses flex-col layout for stacking', () => {
  assert.ok(
    pageContent.includes('flex flex-col items-center gap-4'),
    'Hero CTAs must use flex-col for mobile stacking'
  );
});

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All CTA consolidation tests passed!');
}
