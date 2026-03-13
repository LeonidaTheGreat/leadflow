/**
 * Test: Signup routes redirect to /dashboard/onboarding (not /setup)
 * Task: fix-signup-routes-redirect-to-setup-not-dashboard-onbo
 *
 * Verifies all 3 signup API routes use redirectTo: '/dashboard/onboarding'
 * and email links also point to /dashboard/onboarding (not /setup)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard/app/api');
const TRIAL_SIGNUP = path.join(DASHBOARD_DIR, 'auth/trial-signup/route.ts');
const PILOT_SIGNUP = path.join(DASHBOARD_DIR, 'auth/pilot-signup/route.ts');
const TRIAL_START  = path.join(DASHBOARD_DIR, 'trial/start/route.ts');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// ── trial-signup ──────────────────────────────────────────────────────────────

test('trial-signup: redirectTo is /dashboard/onboarding', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP, 'utf8');
  assert.ok(
    content.includes("redirectTo: '/dashboard/onboarding'"),
    "redirectTo should be '/dashboard/onboarding'"
  );
});

test('trial-signup: redirectTo is NOT /setup', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP, 'utf8');
  const lines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
  const hasSetupRedirect = lines.some(l => l.includes("redirectTo: '/setup'") || l.includes('redirectTo: "/setup"'));
  assert.ok(!hasSetupRedirect, "redirectTo must NOT be '/setup'");
});

test('trial-signup: dashboardUrl email link points to /dashboard/onboarding', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP, 'utf8');
  assert.ok(
    content.includes('leadflow-ai-five.vercel.app/dashboard/onboarding'),
    'dashboardUrl email link should point to /dashboard/onboarding'
  );
  assert.ok(
    !content.includes('leadflow-ai-five.vercel.app/setup'),
    'dashboardUrl email link must NOT point to /setup'
  );
});

// ── pilot-signup ──────────────────────────────────────────────────────────────

test('pilot-signup: redirectTo is /dashboard/onboarding', () => {
  const content = fs.readFileSync(PILOT_SIGNUP, 'utf8');
  assert.ok(
    content.includes("redirectTo: '/dashboard/onboarding'"),
    "redirectTo should be '/dashboard/onboarding'"
  );
});

test('pilot-signup: redirectTo is NOT /setup', () => {
  const content = fs.readFileSync(PILOT_SIGNUP, 'utf8');
  const lines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
  const hasSetupRedirect = lines.some(l => l.includes("redirectTo: '/setup'") || l.includes('redirectTo: "/setup"'));
  assert.ok(!hasSetupRedirect, "redirectTo must NOT be '/setup'");
});

// ── trial/start ───────────────────────────────────────────────────────────────

test('trial/start: redirectTo is /dashboard/onboarding', () => {
  const content = fs.readFileSync(TRIAL_START, 'utf8');
  assert.ok(
    content.includes("redirectTo: '/dashboard/onboarding'"),
    "redirectTo should be '/dashboard/onboarding'"
  );
});

test('trial/start: redirectTo is NOT /setup', () => {
  const content = fs.readFileSync(TRIAL_START, 'utf8');
  const lines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
  const hasSetupRedirect = lines.some(l => l.includes("redirectTo: '/setup'") || l.includes('redirectTo: "/setup"'));
  assert.ok(!hasSetupRedirect, "redirectTo must NOT be '/setup'");
});

// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
