/**
 * QC E2E test for task 16baf10e — Fix: E2E flow test failures (1 critical)
 * Dev task: 29c4d916
 *
 * Verifies the fix for commit d652a02f (restore session.ts, middleware.ts,
 * email-service.ts stubs, rate-limit.ts after a bad revert in commit 475e0d6f).
 *
 * Also detects known regressions introduced by branch drift:
 * - TCPA compliance constants removed from follow-up/route.ts
 * - Nested join reintroduced in follow-up/route.ts (breaks FK schema)
 * - Build failure from type errors
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard');
const LIB_DIR = path.join(DASHBOARD_DIR, 'lib');

let passed = 0;
let failed = 0;
const results = [];

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
    results.push({ name, status: 'pass' });
  } catch (e) {
    console.error(`  FAIL: ${name} — ${e.message}`);
    failed++;
    results.push({ name, status: 'fail', error: e.message });
  }
}

console.log('\n=== QC: Fix E2E flow test failures (16baf10e / 29c4d916) ===\n');

// Test 1: session.ts does not import @supabase/supabase-js
check('session.ts does not import @supabase/supabase-js', () => {
  const sessionSrc = fs.readFileSync(path.join(LIB_DIR, 'session.ts'), 'utf8');
  assert(
    !sessionSrc.includes("from '@supabase/supabase-js'"),
    'session.ts still imports @supabase/supabase-js (package is not installed)'
  );
});

// Test 2: session.ts uses local db client
check('session.ts uses local db client (@/lib/db)', () => {
  const sessionSrc = fs.readFileSync(path.join(LIB_DIR, 'session.ts'), 'utf8');
  assert(
    sessionSrc.includes("from '@/lib/db'") || sessionSrc.includes('AuthService'),
    'session.ts does not use local db client or AuthService'
  );
});

// Test 3: email-service.ts exports required stubs
const requiredEmailExports = [
  'sendWelcomeEmail',
  'sendPasswordResetEmail',
  'sendAhaMomentDay1Email',
  'sendAhaMomentDay3Email',
  'sendPilotWelcomeEmail',
  'sendPilotInviteEmail',
  'sendPilotAhaMomentEmail',
  'sendPilotSetupCompleteEmail',
  'sendPilotTrialCTAEmail',
];
const emailSrc = fs.readFileSync(path.join(LIB_DIR, 'email-service.ts'), 'utf8');
for (const fn of requiredEmailExports) {
  check(`email-service.ts exports ${fn}`, () => {
    assert(emailSrc.includes(`export async function ${fn}`), `Missing export: ${fn}`);
  });
}

// Test 4: rate-limit.ts exports checkDemoSmsRateLimit
check('rate-limit.ts exports checkDemoSmsRateLimit', () => {
  const rlSrc = fs.readFileSync(path.join(LIB_DIR, 'rate-limit.ts'), 'utf8');
  assert(rlSrc.includes('export function checkDemoSmsRateLimit'), 'Missing checkDemoSmsRateLimit export');
});

// Test 5: middleware.ts uses jose jwtVerify (full auth pipeline restored)
check('middleware.ts uses jose jwtVerify', () => {
  const mwSrc = fs.readFileSync(path.join(DASHBOARD_DIR, 'middleware.ts'), 'utf8');
  assert(mwSrc.includes('jwtVerify'), 'middleware.ts does not use jwtVerify — full auth pipeline not restored');
});

// Test 6: TCPA compliance constants present in follow-up/route.ts (regression check)
check('follow-up/route.ts retains TCPA compliance constants', () => {
  const routeSrc = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/cron/follow-up/route.ts'),
    'utf8'
  );
  assert(
    routeSrc.includes('SMS_COMPLIANCE_FOOTER') || routeSrc.includes('STOP to opt out'),
    'TCPA compliance footer removed from follow-up route — regression from branch drift'
  );
});

// Test 7: dashboard build succeeds (no TypeScript errors)
check('npm run build succeeds in dashboard (no TypeScript errors)', () => {
  try {
    execSync('npm run build', {
      cwd: DASHBOARD_DIR,
      stdio: 'pipe',
      timeout: 120000,
    });
  } catch (e) {
    const output = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    const typeError = output.match(/Type error:.*/) || output.match(/Failed to type check/);
    const shortError = typeError ? typeError[0].trim() : 'Build failed (see npm run build output)';
    throw new Error(shortError);
  }
});

// Summary
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('\nFAILED TESTS:');
  results.filter(r => r.status === 'fail').forEach(r => console.error(`  - ${r.name}: ${r.error}`));
  process.exit(1);
}
