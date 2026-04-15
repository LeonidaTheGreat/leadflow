/**
 * E2E Test: fix-landing-page-page-tsx-has-zero-cta-click-analytics
 * Verifies that CTA click tracking is properly implemented across landing pages
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const GA4_PATH = path.join(__dirname, '../product/lead-response/dashboard/lib/analytics/ga4.ts');
const PAGE_PATH = path.join(__dirname, '../product/lead-response/dashboard/app/page.tsx');
const PILOT_PAGE_PATH = path.join(__dirname, '../product/lead-response/dashboard/app/pilot/page.tsx');
const TRIAL_FORM_PATH = path.join(__dirname, '../product/lead-response/dashboard/components/trial-signup-form.tsx');

console.log('=== E2E Test: Landing Page CTA Click Analytics ===\n');

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

// ============================================================================
// 1. GA4 Module Tests
// ============================================================================

const ga4Content = fs.readFileSync(GA4_PATH, 'utf8');

test('GA4: trackCTAClick function is exported', () => {
  assert.ok(
    ga4Content.includes('export function trackCTAClick'),
    'ga4.ts must export trackCTAClick function'
  );
});

test('GA4: trackCTAClick has correct signature', () => {
  const ctaClickRegex = /export function trackCTAClick\(\s*ctaId:\s*CTAId,\s*ctaLabel:\s*string,\s*section:\s*Section/;
  assert.ok(
    ctaClickRegex.test(ga4Content),
    'trackCTAClick must have ctaId, ctaLabel, section parameters'
  );
});

test('GA4: trackCTAClick fires cta_click event', () => {
  assert.ok(
    ga4Content.includes("trackEvent('cta_click'"),
    'trackCTAClick must fire cta_click event'
  );
});

test('GA4: CTA identifiers defined include pricing CTAs', () => {
  assert.ok(
    ga4Content.includes("'pricing_starter'"),
    'Must include pricing_starter CTA ID'
  );
  assert.ok(
    ga4Content.includes("'pricing_pro'"),
    'Must include pricing_pro CTA ID'
  );
  assert.ok(
    ga4Content.includes("'pricing_team'"),
    'Must include pricing_team CTA ID'
  );
});

// ============================================================================
// 2. Landing Page (page.tsx) Tests
// ============================================================================

const pageContent = fs.readFileSync(PAGE_PATH, 'utf8');

test('Landing Page: trackCTAClick is imported', () => {
  assert.ok(
    pageContent.includes("import { trackCTAClick } from '@/lib/analytics/ga4'"),
    'page.tsx must import trackCTAClick from ga4'
  );
});

test('Landing Page: Nav Pilot Program link has onClick tracking', () => {
  const navPilotRegex = /href="\/pilot"[\s\S]{0,300}onClick=\{[\s\S]{0,150}trackCTAClick\('join_pilot_nav'/;
  assert.ok(
    navPilotRegex.test(pageContent),
    'Nav Pilot Program link must have onClick with trackCTAClick(join_pilot_nav)'
  );
});

test('Landing Page: Hero TrialSignupForm receives onSubmitClick prop', () => {
  const heroFormRegex = /<TrialSignupForm[\s\S]{0,300}onSubmitClick/;
  assert.ok(
    heroFormRegex.test(pageContent),
    'Hero TrialSignupForm must have onSubmitClick prop'
  );
});

test('Landing Page: Hero TrialSignupForm onSubmitClick calls trackCTAClick', () => {
  const heroTrackingRegex = /onSubmitClick=\{[\s\S]{0,150}trackCTAClick\('start_trial_form'/;
  assert.ok(
    heroTrackingRegex.test(pageContent),
    'Hero TrialSignupForm onSubmitClick must track start_trial_form'
  );
});

test('Landing Page: Pricing Starter card has Get Started tracking', () => {
  const starterRegex = /pricing_starter|Starter[\s\S]{0,500}Get Started/;
  assert.ok(
    pageContent.includes("'pricing_starter'") && pageContent.includes("trackCTAClick"),
    'Pricing Starter card must have pricing_starter CTA tracking'
  );
});

test('Landing Page: Pricing Pro card has Get Started tracking', () => {
  assert.ok(
    pageContent.includes("'pricing_pro'") && pageContent.includes("trackCTAClick"),
    'Pricing Pro card must have pricing_pro CTA tracking'
  );
});

test('Landing Page: Pricing Team card has Get Started tracking', () => {
  assert.ok(
    pageContent.includes("'pricing_team'") && pageContent.includes("trackCTAClick"),
    'Pricing Team card must have pricing_team CTA tracking'
  );
});

test('Landing Page: PricingCard has ctaIdMap mapping', () => {
  assert.ok(
    pageContent.includes("ctaIdMap") && pageContent.includes("pricing_starter") && pageContent.includes("pricing_pro"),
    'PricingCard must have ctaIdMap to map tier names to CTA IDs'
  );
});

test('Landing Page: Pricing "or start free trial" links have tracking', () => {
  const trialLinkCount = (pageContent.match(/or start free trial/g) || []).length;
  const trackingCount = (pageContent.match(/start_trial_form.*pricing/g) || []).length;
  assert.ok(
    trackingCount >= 1,
    'Pricing section must have start_trial_form tracking for trial links'
  );
});

// ============================================================================
// 3. Trial Signup Form Tests
// ============================================================================

const trialFormContent = fs.readFileSync(TRIAL_FORM_PATH, 'utf8');

test('TrialSignupForm: accepts onSubmitClick prop', () => {
  assert.ok(
    trialFormContent.includes('onSubmitClick'),
    'TrialSignupForm must accept onSubmitClick prop'
  );
});

test('TrialSignupForm: calls onSubmitClick on form submit', () => {
  assert.ok(
    trialFormContent.includes('onSubmitClick()') || trialFormContent.includes('onSubmitClick?.()'),
    'TrialSignupForm must call onSubmitClick callback on submit'
  );
});

// ============================================================================
// 4. Pilot Page Tests
// ============================================================================

const pilotPageContent = fs.readFileSync(PILOT_PAGE_PATH, 'utf8');

test('Pilot Page: trackCTAClick is imported', () => {
  assert.ok(
    pilotPageContent.includes("import { trackCTAClick"),
    'pilot/page.tsx must import trackCTAClick'
  );
});

test('Pilot Page: trackFormEvent is still imported', () => {
  assert.ok(
    pilotPageContent.includes("import { trackCTAClick, trackFormEvent"),
    'pilot/page.tsx must import both trackCTAClick and trackFormEvent'
  );
});

test('Pilot Page: Submit button calls trackCTAClick for join_pilot_hero', () => {
  assert.ok(
    pilotPageContent.includes("trackCTAClick('join_pilot_hero'"),
    'Pilot submit button must track join_pilot_hero CTA'
  );
});

test('Pilot Page: trackCTAClick is called before trackFormEvent in handleSubmit', () => {
  const submitRegex = /handleSubmit[\s\S]{0,500}trackCTAClick\('join_pilot_hero'[\s\S]{0,300}trackFormEvent\('form_submit_attempt'/;
  assert.ok(
    submitRegex.test(pilotPageContent),
    'trackCTAClick must be called before trackFormEvent in handleSubmit'
  );
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
}
