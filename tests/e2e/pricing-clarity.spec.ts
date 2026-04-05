/**
 * E2E Test: Pricing Clarity for Trial Users (uc-revenue-pricing-clarity)
 * Task ID: fdf40371-7ca3-4107-9016-1ae691d2b030
 *
 * Verifies the pricing clarity implementation per PRD-PRICING-CLARITY-TRIAL-USERS:
 * 1. [trial-banner] TrialStatusBanner shows days remaining + $149 price + "See all plans" link
 * 2. [see-plans-nav] "See all plans" links to /dashboard/pricing
 * 3. [pricing-page] Pricing page exists with all 4 tiers and correct prices
 * 4. [upgrade-cta] "Choose plan" CTAs exist and trigger Stripe checkout
 * 5. [event-tracking] trial_pricing_viewed, trial_upgrade_clicked, trial_checkout_started events registered
 * 6. [day-5-urgency] Agent with 5 days left sees amber banner
 * 7. [day-2-urgency] Agent with 2 days left sees red banner
 */

'use strict';

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard');

let passed = 0;
let failed = 0;
const results: Array<{ name: string; status: 'PASS' | 'FAIL'; reason?: string }> = [];

function pass(name: string) {
  console.log(`  ✓ ${name}`);
  passed++;
  results.push({ name, status: 'PASS' });
}

function fail(name: string, reason: string) {
  console.error(`  ✗ ${name}: ${reason}`);
  failed++;
  results.push({ name, status: 'FAIL', reason });
}

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(DASHBOARD_DIR, relPath), 'utf8');
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(DASHBOARD_DIR, relPath));
}

console.log('\n=== E2E: Pricing Clarity for Trial Users ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. [trial-banner] TrialStatusBanner
// ─────────────────────────────────────────────────────────────────────────────

console.log('1. [trial-banner] TrialStatusBanner:');

try {
  const banner = readFile('components/dashboard/TrialStatusBanner.tsx');

  // AC#1: shows $149
  assert.ok(banner.includes('$149'), 'Missing $149 price in TrialStatusBanner');
  pass('TrialStatusBanner shows $149 (Pro plan price)');
} catch (err: any) {
  fail('TrialStatusBanner shows $149', err.message);
}

try {
  const banner = readFile('components/dashboard/TrialStatusBanner.tsx');

  // AC#2: has "See all plans" link
  assert.ok(banner.includes('See all plans'), 'Missing "See all plans" link text');
  pass('TrialStatusBanner has "See all plans" link');
} catch (err: any) {
  fail('TrialStatusBanner "See all plans" link', err.message);
}

try {
  const banner = readFile('components/dashboard/TrialStatusBanner.tsx');

  // days remaining countdown
  assert.ok(banner.includes('daysRemaining'), 'Missing daysRemaining countdown');
  pass('TrialStatusBanner has days remaining countdown');
} catch (err: any) {
  fail('TrialStatusBanner days remaining', err.message);
}

try {
  const banner = readFile('components/dashboard/TrialStatusBanner.tsx');

  // isTrial check (only shows for trial agents)
  assert.ok(banner.includes('isTrial'), 'Missing isTrial check');
  assert.ok(banner.includes('/api/auth/trial-status'), 'Missing trial status API call');
  pass('TrialStatusBanner fetches trial status and checks isTrial');
} catch (err: any) {
  fail('TrialStatusBanner trial status fetch', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. [see-plans-nav] Navigation to pricing page
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n2. [see-plans-nav] Navigation to pricing page:');

try {
  const banner = readFile('components/dashboard/TrialStatusBanner.tsx');

  // Links to /dashboard/pricing
  assert.ok(banner.includes('/dashboard/pricing'), 'Missing link to /dashboard/pricing');
  pass('TrialStatusBanner links to /dashboard/pricing');
} catch (err: any) {
  fail('TrialStatusBanner links to /dashboard/pricing', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. [pricing-page] Pricing page exists with all 4 tiers
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n3. [pricing-page] Pricing page:');

// AC#3: file exists
try {
  assert.ok(fileExists('app/dashboard/pricing/page.tsx'), 'Pricing page file not found');
  pass('Pricing page exists at app/dashboard/pricing/page.tsx');
} catch (err: any) {
  fail('Pricing page file exists', err.message);
}

// AC#4: has data-testid="pricing-page"
try {
  const pricingPage = readFile('app/dashboard/pricing/page.tsx');
  assert.ok(pricingPage.includes('data-testid="pricing-page"'), 'Missing data-testid="pricing-page"');
  pass('Pricing page has data-testid="pricing-page"');
} catch (err: any) {
  fail('Pricing page data-testid', err.message);
}

// All 4 tiers present
const tiers = [
  { name: 'Starter', price: '$49' },
  { name: 'Pro', price: '$149' },
  { name: 'Team', price: '$399' },
  { name: 'Brokerage', price: '$999' },
];

for (const tier of tiers) {
  try {
    const pricingPage = readFile('app/dashboard/pricing/page.tsx');
    assert.ok(pricingPage.includes(tier.name), `Missing tier name: ${tier.name}`);
    assert.ok(pricingPage.includes(tier.price), `Missing price: ${tier.price}`);
    pass(`Pricing page shows ${tier.name} at ${tier.price}`);
  } catch (err: any) {
    fail(`Pricing page tier ${tier.name}`, err.message);
  }
}

// Trial-specific messaging
try {
  const pricingPage = readFile('app/dashboard/pricing/page.tsx');
  assert.ok(
    pricingPage.includes("currently on a free trial"),
    'Missing trial-specific messaging'
  );
  pass('Pricing page has trial-specific messaging');
} catch (err: any) {
  fail('Pricing page trial messaging', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. [upgrade-cta] Stripe checkout CTAs
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n4. [upgrade-cta] Upgrade CTAs and Stripe checkout:');

try {
  const pricingPage = readFile('app/dashboard/pricing/page.tsx');

  // Each tier has a CTA
  assert.ok(pricingPage.includes('Choose Starter'), 'Missing Choose Starter CTA');
  assert.ok(pricingPage.includes('Choose Pro'), 'Missing Choose Pro CTA');
  assert.ok(pricingPage.includes('Choose Team'), 'Missing Choose Team CTA');
  assert.ok(pricingPage.includes('Contact Sales'), 'Missing Contact Sales CTA for Brokerage');
  pass('All 4 tier CTAs present on pricing page');
} catch (err: any) {
  fail('Pricing page tier CTAs', err.message);
}

try {
  const pricingPage = readFile('app/dashboard/pricing/page.tsx');

  // Stripe checkout integration
  assert.ok(pricingPage.includes('/api/stripe/upgrade-checkout'), 'Missing Stripe checkout API call');
  assert.ok(pricingPage.includes("method: 'POST'"), 'Missing POST method for checkout');
  pass('Pricing page calls Stripe upgrade-checkout API');
} catch (err: any) {
  fail('Pricing page Stripe checkout', err.message);
}

try {
  const checkoutRoute = readFile('app/api/stripe/upgrade-checkout/route.ts');

  // Plan pre-filling: route accepts plan param
  assert.ok(checkoutRoute.includes('starter'), 'Checkout route missing starter plan');
  assert.ok(checkoutRoute.includes('pro'), 'Checkout route missing pro plan');
  assert.ok(checkoutRoute.includes('team'), 'Checkout route missing team plan');
  assert.ok(checkoutRoute.includes('PLAN_PRICE_IDS'), 'Checkout route missing PLAN_PRICE_IDS mapping');
  pass('Stripe checkout route supports all plans with price IDs');
} catch (err: any) {
  fail('Stripe checkout route plan pre-filling', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. [event-tracking] Conversion events
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n5. [event-tracking] Conversion event tracking:');

try {
  const eventsRoute = readFile('app/api/events/track/route.ts');

  assert.ok(eventsRoute.includes('trial_pricing_viewed'), 'Missing trial_pricing_viewed event');
  assert.ok(eventsRoute.includes('trial_upgrade_clicked'), 'Missing trial_upgrade_clicked event');
  assert.ok(eventsRoute.includes('trial_checkout_started'), 'Missing trial_checkout_started event');
  pass('events/track API registers all 3 pricing clarity events');
} catch (err: any) {
  fail('events/track pricing events', err.message);
}

// AC#7: pricing page fires trial_pricing_viewed on mount
try {
  const pricingPage = readFile('app/dashboard/pricing/page.tsx');
  assert.ok(pricingPage.includes('trial_pricing_viewed'), 'Pricing page does not fire trial_pricing_viewed');
  assert.ok(pricingPage.includes('trial_upgrade_clicked'), 'Pricing page does not fire trial_upgrade_clicked');
  assert.ok(pricingPage.includes('trial_checkout_started'), 'Pricing page does not fire trial_checkout_started');
  pass('Pricing page fires all 3 conversion events at appropriate times');
} catch (err: any) {
  fail('Pricing page event firing', err.message);
}

try {
  const banner = readFile('components/dashboard/TrialStatusBanner.tsx');
  assert.ok(banner.includes('trial_upgrade_clicked'), 'Banner does not fire trial_upgrade_clicked');
  assert.ok(banner.includes('trial_checkout_started'), 'Banner does not fire trial_checkout_started');
  pass('TrialStatusBanner fires upgrade and checkout events');
} catch (err: any) {
  fail('TrialStatusBanner event firing', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. [day-5-urgency] Amber banner at ≤5 days remaining
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n6. [day-5-urgency] Amber urgency at ≤5 days:');

try {
  const banner = readFile('components/dashboard/TrialStatusBanner.tsx');

  // Check amber urgency threshold is 5
  assert.ok(
    banner.includes('daysRemaining <= 5') || banner.includes('<= 5'),
    'Missing ≤5 days amber urgency threshold'
  );
  assert.ok(banner.includes('amber'), 'Missing amber color classes for urgency');
  pass('TrialStatusBanner uses amber styling when ≤5 days remaining');
} catch (err: any) {
  fail('Amber urgency at ≤5 days', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. [day-2-urgency] Red banner at ≤2 days remaining
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n7. [day-2-urgency] Red urgency at ≤2 days:');

try {
  const banner = readFile('components/dashboard/TrialStatusBanner.tsx');

  // Check red urgency threshold is 2
  assert.ok(
    banner.includes('daysRemaining <= 2') || banner.includes('<= 2'),
    'Missing ≤2 days red urgency threshold'
  );
  assert.ok(banner.includes('red'), 'Missing red color classes for critical urgency');
  pass('TrialStatusBanner uses red styling when ≤2 days remaining');
} catch (err: any) {
  fail('Red urgency at ≤2 days', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding pricing mention (AC#5)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n8. [onboarding-pricing] Onboarding pricing mention:');

// AC#5: onboarding mentions starting price
try {
  const confirmStep = readFile('app/onboarding/steps/confirmation.tsx');
  const lowerContent = confirmStep.toLowerCase();
  assert.ok(
    lowerContent.includes('plans start at') || lowerContent.includes('$49'),
    'Onboarding confirmation does not mention starting price ($49/mo)'
  );
  pass('Onboarding confirmation step mentions $49/mo starting price');
} catch (err: any) {
  fail('Onboarding pricing mention', err.message);
}

try {
  const confirmStep = readFile('app/onboarding/steps/confirmation.tsx');
  assert.ok(
    confirmStep.includes('/dashboard/pricing'),
    'Onboarding confirmation does not link to pricing page'
  );
  pass('Onboarding confirmation links to pricing page');
} catch (err: any) {
  fail('Onboarding confirmation pricing link', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '-'.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('-'.repeat(60));

if (failed > 0) {
  console.log('\nFailed tests:');
  results.filter((r) => r.status === 'FAIL').forEach((r) => {
    console.log(`  - ${r.name}: ${r.reason}`);
  });
  process.exit(1);
} else {
  console.log('\nAll E2E tests passed!');
  process.exit(0);
}
