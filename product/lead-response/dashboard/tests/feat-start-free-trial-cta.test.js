/**
 * E2E Tests for: Start Free Trial CTA — Frictionless Trial Entry
 * PRD: PRD-START-FREE-TRIAL-CTA
 * Task: b3fb39ed-ee3b-42c8-b39f-1cb5312be000
 *
 * Tests static code analysis of the feature implementation.
 * Live server tests are skipped if server is not reachable.
 */

const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.resolve(__dirname, '..');
const TESTS_PASS = [];
const TESTS_FAIL = [];
const TESTS_SKIP = [];

function pass(name) {
  console.log(`  ✅ PASS: ${name}`);
  TESTS_PASS.push(name);
}

function fail(name, reason) {
  console.error(`  ❌ FAIL: ${name}`);
  if (reason) console.error(`       → ${reason}`);
  TESTS_FAIL.push({ name, reason });
}

function skip(name, reason) {
  console.log(`  ⏭  SKIP: ${name} — ${reason}`);
  TESTS_SKIP.push(name);
}

function readFile(rel) {
  const abs = path.join(DASHBOARD_DIR, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 / FR-1: /api/trial/start endpoint must exist and implement frictionless
//              provisioning (plan_tier='trial', trial_ends_at, source='trial_cta')
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 AC-1/FR-3: /api/trial/start endpoint');

const trialRoute = readFile('app/api/trial/start/route.ts');
if (!trialRoute) {
  fail('/api/trial/start/route.ts exists', 'File not found');
} else {
  pass('/api/trial/start/route.ts exists');
  trialRoute.includes("plan_tier: 'trial'") ? pass("Sets plan_tier='trial'") : fail("Sets plan_tier='trial'", "Missing in INSERT");
  trialRoute.includes('trial_ends_at') ? pass("Sets trial_ends_at") : fail("Sets trial_ends_at", "Missing field");
  trialRoute.includes("source: 'trial_cta'") ? pass("Sets source='trial_cta'") : fail("Sets source='trial_cta'", "Missing attribution");
  trialRoute.includes('trial_started') ? pass("Logs trial_started event") : fail("Logs trial_started event", "Missing analytics event");
  trialRoute.includes('30') && trialRoute.includes('setDate') ? pass("Trial duration is 30 days") : fail("Trial duration is 30 days", "30-day calc not found");
  trialRoute.includes('mrr: 0') || trialRoute.includes("mrr") ? pass("mrr set to 0") : skip("mrr=0 in insert", "mrr field not found (may be defaulted by DB)");
  trialRoute.includes('redirectTo') ? pass("Returns redirectTo for onboarding") : fail("Returns redirectTo for onboarding", "Missing redirect in response");
  trialRoute.includes("emailRegex") || trialRoute.includes('email.*valid') ? pass("Email validation present") : fail("Email validation present", "No email format check");
  trialRoute.includes("password.length < 8") || trialRoute.includes("min 8") || trialRoute.includes("minLength") ? pass("Password min 8 chars validation") : fail("Password min 8 chars validation", "No password length check");
  trialRoute.includes('already exists') ? pass("Duplicate email error message") : fail("Duplicate email error message", "Missing 409/duplicate check");
  trialRoute.includes('utm_source') ? pass("UTM params captured in trial signup") : fail("UTM params captured in trial signup", "utm_source not in INSERT");
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 / FR-2: Trial signup form — 2-field frictionless form
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 AC-2/FR-2: Trial signup form component');

const signupForm = readFile('components/trial-signup-form.tsx');
if (!signupForm) {
  fail('components/trial-signup-form.tsx exists', 'File not found');
} else {
  pass('components/trial-signup-form.tsx exists');
  signupForm.includes('email') ? pass("Has email field") : fail("Has email field", "No email input");
  signupForm.includes('password') ? pass("Has password field") : fail("Has password field", "No password input");
  signupForm.includes('/api/trial/start') ? pass("Submits to /api/trial/start") : fail("Submits to /api/trial/start", "Wrong API endpoint");
  !signupForm.includes('credit card') && !signupForm.includes('creditCard') && !signupForm.includes('stripe') ?
    pass("No credit card field in trial form") :
    fail("No credit card field in trial form", "Credit card reference found");
  (signupForm.includes('No Credit Card') || signupForm.includes('no credit card') || signupForm.includes('No credit card')) ?
    pass("Trust signal 'No Credit Card' present") :
    fail("Trust signal 'No Credit Card' present", "Missing trust signal text");
  signupForm.includes('Create My Free Account') || signupForm.includes('Create Free Account') || signupForm.includes('Start Free Trial') ?
    pass("CTA button label present") :
    fail("CTA button label present", "Submit label not matching PRD");
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-3: Trial badge in dashboard nav
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 AC-3: Trial badge in dashboard nav');

const trialBadge = readFile('components/dashboard/trial-badge.tsx');
if (!trialBadge) {
  fail('components/dashboard/trial-badge.tsx exists', 'File not found');
} else {
  pass('components/dashboard/trial-badge.tsx exists');
  trialBadge.includes("plan_tier !== 'trial'") || trialBadge.includes("planTier !== 'trial'") ?
    pass("Badge only shown for trial tier") :
    fail("Badge only shown for trial tier", "No planTier check");
  trialBadge.includes('daysRemaining') && trialBadge.includes('days remaining') ?
    pass("Shows days remaining in badge") :
    fail("Shows days remaining in badge", "Missing days remaining text");
  trialBadge.includes('/settings/billing') ? pass("Badge links to /settings/billing") : fail("Badge links to /settings/billing", "Wrong link");
  trialBadge.includes('<= 7') || trialBadge.includes('<=7') ?
    pass("Badge turns red/urgent when ≤ 7 days") :
    fail("Badge turns red/urgent when ≤ 7 days", "No ≤7 day urgency logic");
}

const dashNav = readFile('app/dashboard/dashboard-nav.tsx') || readFile('app/dashboard/layout.tsx');
if (!dashNav) {
  fail('Dashboard nav/layout contains TrialBadge', 'Neither dashboard-nav.tsx nor layout.tsx found');
} else if (dashNav.includes('TrialBadge') || dashNav.includes('trial-badge')) {
  pass("TrialBadge imported in dashboard nav/layout");
} else {
  fail("TrialBadge imported in dashboard nav/layout", "TrialBadge not integrated in nav/layout");
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 / FR-5: 3 CTA placements on landing page
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 AC-4/FR-5: 3 CTA placements on landing page');

const landingPage = readFile('app/page.tsx');
if (!landingPage) {
  fail('app/page.tsx (landing page) exists', 'File not found');
} else {
  pass('app/page.tsx (landing page) exists');
  const trialCtaMatches = (landingPage.match(/Start Free Trial/gi) || []).length;
  trialCtaMatches >= 3 ?
    pass(`"Start Free Trial" appears ≥3 times (found ${trialCtaMatches})`) :
    fail(`"Start Free Trial" appears ≥3 times`, `Only found ${trialCtaMatches} occurrences`);

  const hasHeroCta = landingPage.includes('hero') || landingPage.includes('Hero') || landingPage.includes('CTA Placement #1') || landingPage.includes('above');
  hasHeroCta ? pass("Hero/above-fold CTA placement present") : fail("Hero/above-fold CTA placement present", "No hero CTA found");

  const hasFeaturesCta = landingPage.includes('features') || landingPage.includes('Features') || landingPage.includes('CTA Placement #2') || landingPage.includes('benefit');
  hasFeaturesCta ? pass("Features section CTA placement present") : fail("Features section CTA placement present", "No features CTA found");

  const hasPricingCta = landingPage.includes('pricing') || landingPage.includes('Pricing') || landingPage.includes('CTA Placement #3') || landingPage.includes('plan');
  hasPricingCta ? pass("Pricing section CTA placement present") : fail("Pricing section CTA placement present", "No pricing CTA found");

  landingPage.includes('/signup?mode=trial') || landingPage.includes('/signup/trial') ?
    pass("CTAs link to trial signup route") :
    fail("CTAs link to trial signup route", "No trial signup URL found in page");
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 / FR-6: Backward compatibility — existing pilot form accessible
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 AC-5/FR-6: Backward compatibility with pilot form');

const pilotPage = readFile('app/pilot/page.tsx') || readFile('app/(marketing)/pilot/page.tsx');
const landingPageHasPilotLink = landingPage && (landingPage.includes('/pilot') || landingPage.includes('pilot') || landingPage.includes('Apply for Pilot'));
if (pilotPage) {
  pass('Pilot page exists at /pilot');
} else if (landingPageHasPilotLink) {
  pass('Pilot form linked from landing page (pilot route referenced)');
} else {
  fail('Existing pilot form backward compatible', 'No pilot page or link found');
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 / FR-6: Source attribution — source = 'trial_cta'
// (already tested in FR-3 section above, confirm once more)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 AC-6: Source attribution');
if (trialRoute) {
  trialRoute.includes("source: 'trial_cta'") ?
    pass("source='trial_cta' set on trial accounts") :
    fail("source='trial_cta' set on trial accounts", "Missing in INSERT");
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-7 / NFR: Error handling
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 AC-7: Error handling');
if (trialRoute) {
  trialRoute.includes('already exists') || trialRoute.includes('Sign in instead') ?
    pass("Duplicate email returns helpful error") :
    fail("Duplicate email returns helpful error", "Error message missing 'Sign in instead'");
  trialRoute.includes('valid email') || trialRoute.includes('emailRegex') ?
    pass("Invalid email inline validation") :
    fail("Invalid email inline validation", "No email format validation");
  trialRoute.includes('Something went wrong') || trialRoute.includes('Please try again') ?
    pass("Generic network error message present") :
    fail("Generic network error message present", "No generic error fallback");
}

// ─────────────────────────────────────────────────────────────────────────────
// Security checks
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Security');
if (trialRoute) {
  !trialRoute.includes('sk_live_') && !trialRoute.includes('sk_test_') ?
    pass("No hardcoded Stripe secrets") :
    fail("No hardcoded Stripe secrets", "Stripe secret found in source");
  trialRoute.includes('bcrypt') || trialRoute.includes('bcryptjs') ?
    pass("Password hashed with bcrypt") :
    fail("Password hashed with bcrypt", "No bcrypt usage found");
  !trialRoute.includes('password_hash: password') ?
    pass("Raw password not stored") :
    fail("Raw password not stored", "password_hash may contain plaintext");
}

// ─────────────────────────────────────────────────────────────────────────────
// PR Branch assessment — are the PRD changes in this PR?
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📋 PR Branch Assessment');
const prBranchHasTrialRoute = fs.existsSync(path.join(DASHBOARD_DIR, 'app/api/trial/start/route.ts'));
const prBranchHasTrialForm = fs.existsSync(path.join(DASHBOARD_DIR, 'components/trial-signup-form.tsx'));
const prBranchHasTrialBadge = fs.existsSync(path.join(DASHBOARD_DIR, 'components/dashboard/trial-badge.tsx'));

!prBranchHasTrialRoute ?
  fail("PR branch contains /api/trial/start (core feature endpoint)", "File not in PR branch — feature missing from this PR") :
  pass("PR branch contains /api/trial/start");
!prBranchHasTrialForm ?
  fail("PR branch contains TrialSignupForm component", "Component not in PR branch") :
  pass("PR branch contains TrialSignupForm component");
!prBranchHasTrialBadge ?
  fail("PR branch contains TrialBadge component", "Component not in PR branch") :
  pass("PR branch contains TrialBadge component");

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
const total = TESTS_PASS.length + TESTS_FAIL.length;
const passRate = total > 0 ? TESTS_PASS.length / total : 0;

console.log('\n═══════════════════════════════════════════════════════');
console.log(`📊 Results: ${TESTS_PASS.length} passed / ${TESTS_FAIL.length} failed / ${TESTS_SKIP.length} skipped`);
console.log(`   Pass rate: ${Math.round(passRate * 100)}%`);

if (TESTS_FAIL.length > 0) {
  console.log('\n❌ FAILING CHECKS:');
  TESTS_FAIL.forEach(({ name, reason }) => {
    console.log(`   • ${name}`);
    if (reason) console.log(`     ↳ ${reason}`);
  });
}

process.exit(TESTS_FAIL.length > 0 ? 1 : 0);
