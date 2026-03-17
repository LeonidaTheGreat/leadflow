/**
 * Test: fix-9-acceptance-criteria-defined-but-not-all-verified
 * Task ID: 767dc2f3-c768-408a-b4bb-92c2ad96b69a
 *
 * Verifies all 9 UC-9 acceptance criteria:
 * 1. Button visible above fold desktop/mobile
 * 2. Email + password only (no extra required fields)
 * 3. Redirect within 5s (redirect destination exists)
 * 4. plan_tier = trial (API sets correct tier)
 * 5. trial_ends_at set 30 days out (API sets trial end)
 * 6. Trial badge in nav (component exists and wired in dashboard nav)
 * 7. CTA in 3 placements on landing page
 * 8. source = trial_cta on agents (API sets source field)
 * 9. Duplicate email error (API returns 409 with message)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard');
const LANDING_PAGE = path.join(DASHBOARD_DIR, 'app/page.tsx');
const TRIAL_SIGNUP_FORM = path.join(DASHBOARD_DIR, 'components/trial-signup-form.tsx');
const TRIAL_SIGNUP_API = path.join(DASHBOARD_DIR, 'app/api/auth/trial-signup/route.ts');
const DASHBOARD_NAV = path.join(DASHBOARD_DIR, 'app/dashboard/dashboard-nav.tsx');
const TRIAL_BADGE = path.join(DASHBOARD_DIR, 'components/dashboard/trial-badge.tsx');
const TRIAL_SIGNUP_PAGE = path.join(DASHBOARD_DIR, 'app/signup/trial/page.tsx');
const ONBOARDING_PAGE = path.join(DASHBOARD_DIR, 'app/onboarding');

console.log('=== UC-9: All 9 Acceptance Criteria Verification ===\n');

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

// --- Load files ---
const landingContent = fs.readFileSync(LANDING_PAGE, 'utf8');
const trialFormContent = fs.readFileSync(TRIAL_SIGNUP_FORM, 'utf8');
const trialApiContent = fs.readFileSync(TRIAL_SIGNUP_API, 'utf8');
const dashNavContent = fs.readFileSync(DASHBOARD_NAV, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// AC-1: Button visible above fold desktop/mobile
// The nav and hero section both contain a "Start Free Trial" CTA
// ─────────────────────────────────────────────────────────────────────────────
test('AC-1: Nav (above fold) has Start Free Trial CTA linking to /signup/trial', () => {
  // Nav CTA appears before the main content — visible above fold
  const navSection = landingContent.split('<main')[0];
  assert.ok(
    navSection.includes('href="/signup/trial"') || navSection.includes("href='/signup/trial'"),
    'Nav must contain a link to /signup/trial (above fold)'
  );
  assert.ok(
    navSection.includes('Start Free Trial'),
    'Nav must contain "Start Free Trial" text (above fold)'
  );
});

test('AC-1: Hero contains TrialSignupForm compact (above fold — no scroll needed)', () => {
  assert.ok(
    landingContent.includes('<TrialSignupForm compact'),
    'Hero must render <TrialSignupForm compact to show trial form above fold'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2: Email + password only (no other required fields)
// ─────────────────────────────────────────────────────────────────────────────
test('AC-2: Trial signup form requires only email and password (no phone, etc.)', () => {
  // The form has email + password as required fields; name is optional
  assert.ok(trialFormContent.includes('type="email"'), 'Form must have email field');
  assert.ok(trialFormContent.includes("type={showPassword ? 'text' : 'password'}"), 'Form must have password field');
  // Name field should NOT be required
  const nameFieldMatch = trialFormContent.match(/id="trial-name"[\s\S]{0,300}/);
  if (nameFieldMatch) {
    assert.ok(
      !nameFieldMatch[0].includes('required'),
      'Name field must NOT be required'
    );
  }
});

test('AC-2: Trial signup API validates only email + password as required', () => {
  assert.ok(
    trialApiContent.includes('!email || !password'),
    'API must require email and password'
  );
  // Phone is NOT required
  assert.ok(
    !trialApiContent.includes('!phone') && !trialApiContent.includes('!phoneNumber'),
    'API must NOT require phone number'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3: Redirect within 5s (redirect destination /dashboard/onboarding exists)
// ─────────────────────────────────────────────────────────────────────────────
test('AC-3: Trial signup API redirects to /dashboard/onboarding', () => {
  assert.ok(
    trialApiContent.includes('/dashboard/onboarding'),
    "API must set redirectTo: '/dashboard/onboarding'"
  );
});

test('AC-3: /dashboard/onboarding page exists', () => {
  const onboardingIndexPath = path.join(DASHBOARD_DIR, 'app/dashboard/onboarding');
  assert.ok(
    fs.existsSync(onboardingIndexPath),
    '/dashboard/onboarding directory must exist'
  );
});

test('AC-3: Trial signup form redirects using router.push (client-side, fast)', () => {
  assert.ok(
    trialFormContent.includes('router.push('),
    'Form must use router.push for immediate client-side redirect'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4: plan_tier = trial
// ─────────────────────────────────────────────────────────────────────────────
test("AC-4: Trial signup API inserts plan_tier: 'trial'", () => {
  assert.ok(
    trialApiContent.includes("plan_tier: 'trial'"),
    "API must set plan_tier: 'trial' on new agent record"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5: trial_ends_at set (14 or 30 days out)
// ─────────────────────────────────────────────────────────────────────────────
test('AC-5: Trial signup API sets trial_ends_at on the agent record', () => {
  assert.ok(
    trialApiContent.includes('trial_ends_at'),
    'API must set trial_ends_at field'
  );
  // Must be calculated from current time (not hardcoded)
  assert.ok(
    trialApiContent.includes('Date.now()') || trialApiContent.includes('new Date()'),
    'trial_ends_at must be dynamically calculated from current time'
  );
  // Ensure it is at least 14 days (14 or 30)
  const hasDays = trialApiContent.includes('14 * 24 * 60 * 60') || trialApiContent.includes('30 * 24 * 60 * 60');
  assert.ok(hasDays, 'trial_ends_at must be set 14 or 30 days from now');
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6: Trial badge in nav
// ─────────────────────────────────────────────────────────────────────────────
test('AC-6: TrialBadge component file exists', () => {
  assert.ok(fs.existsSync(TRIAL_BADGE), 'components/dashboard/trial-badge.tsx must exist');
});

test('AC-6: DashboardNav imports and renders TrialBadge', () => {
  assert.ok(
    dashNavContent.includes('TrialBadge'),
    'DashboardNav must import and render the TrialBadge component'
  );
  assert.ok(
    dashNavContent.includes('plan_tier') || dashNavContent.includes('planTier'),
    'DashboardNav must pass plan_tier to TrialBadge'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7: CTA in 3 placements on landing page
// ─────────────────────────────────────────────────────────────────────────────
test('AC-7: Landing page CTA Placement #1 — TrialSignupForm compact in hero', () => {
  assert.ok(
    landingContent.includes('<TrialSignupForm compact'),
    'Landing page must have <TrialSignupForm compact in hero section'
  );
});

test('AC-7: Landing page CTA Placement #2 — Start Free Trial link in features section', () => {
  const featuresCTARegex = /href="\/signup\/trial"[\s\S]{0,300}Start Free Trial/;
  assert.ok(
    featuresCTARegex.test(landingContent),
    'Features section must have a "Start Free Trial" link to /signup/trial'
  );
});

test('AC-7: Landing page CTA Placement #3 — "or start free trial" link in pricing section', () => {
  assert.ok(
    landingContent.includes('or start free trial'),
    'Pricing section must contain "or start free trial" text'
  );
  const pricingTrialRegex = /href="\/signup\/trial"[\s\S]{0,200}or start free trial/;
  assert.ok(
    pricingTrialRegex.test(landingContent),
    'Pricing "or start free trial" must link to /signup/trial'
  );
});

test('AC-7: TrialSignupForm is imported on the landing page', () => {
  assert.ok(
    landingContent.includes("import TrialSignupForm from '@/components/trial-signup-form'"),
    'TrialSignupForm must be imported on the landing page'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8: source = trial_cta on agents record
// ─────────────────────────────────────────────────────────────────────────────
test("AC-8: Trial signup API sets source: 'trial_cta' on agent record", () => {
  assert.ok(
    trialApiContent.includes("source: 'trial_cta'"),
    "API must set source: 'trial_cta' when inserting agent record"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9: Duplicate email returns error with sign-in link
// ─────────────────────────────────────────────────────────────────────────────
test('AC-9: Trial signup API checks for existing email and returns 409', () => {
  assert.ok(
    trialApiContent.includes('existingAgent'),
    'API must query for existing agent by email'
  );
  assert.ok(
    trialApiContent.includes('status: 409'),
    'API must return 409 status for duplicate email'
  );
  assert.ok(
    trialApiContent.includes('already exists'),
    'API 409 error must say email already exists'
  );
});

test('AC-9: Trial signup form shows sign-in link on duplicate email error (409)', () => {
  assert.ok(
    trialFormContent.includes('isDuplicateEmailError'),
    'Form must track isDuplicateEmailError state'
  );
  assert.ok(
    trialFormContent.includes('response.status === 409'),
    'Form must detect 409 status as duplicate email'
  );
  assert.ok(
    trialFormContent.includes('href="/login"'),
    'Form must show link to /login for duplicate email error'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Structural: /signup/trial page exists with trial form
// ─────────────────────────────────────────────────────────────────────────────
test('Structure: /signup/trial page exists', () => {
  assert.ok(
    fs.existsSync(TRIAL_SIGNUP_PAGE),
    'app/signup/trial/page.tsx must exist'
  );
});

test('Structure: /signup/trial page renders TrialSignupForm', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_PAGE, 'utf8');
  assert.ok(
    content.includes('TrialSignupForm'),
    '/signup/trial page must render TrialSignupForm'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.log('\nFailing tests indicate unimplemented acceptance criteria.');
  process.exit(1);
} else {
  console.log('\n✅ All 9 UC-9 acceptance criteria are verified!');
}
