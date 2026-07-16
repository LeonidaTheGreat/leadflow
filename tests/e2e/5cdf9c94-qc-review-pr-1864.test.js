'use strict';

/**
 * QC E2E test for PR #1864: Admin Email Verification Override
 *
 * FINDING: PR #1864 overwrites the existing /admin/activation page and API route.
 * The existing feature (SMS Activation Nudge — PR #1860) sends Twilio SMS to
 * email-verified agents stuck at onboarding step 0. PR #1864 replaces both
 * page.tsx and route.ts with a completely different feature (email verification
 * override), destroying the SMS nudge capability.
 *
 * This test validates that the existing activation route on main has SMS nudge
 * semantics (the feature that must NOT be overwritten).
 */

const assert = require('assert');
const { execSync } = require('child_process');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n=== QC PR #1864: activation route conflict detection ===\n');

// Read the existing route on main to prove it has SMS nudge semantics
let mainRoute;
try {
  mainRoute = execSync(
    'git show origin/main:product/lead-response/dashboard/app/api/admin/activation/route.ts',
    { encoding: 'utf8' }
  );
} catch {
  console.log('  SKIP: could not read main branch route (not in git repo)');
  process.exit(0);
}

check('existing route on main imports sendSms from twilio', () => {
  assert.ok(
    mainRoute.includes("import { sendSms"),
    'main route must import sendSms — it is the SMS nudge feature'
  );
});

check('existing route on main filters by email_verified=true (not false)', () => {
  assert.ok(
    mainRoute.includes(".eq('email_verified', true)"),
    'main route queries for email_verified=true (verified agents stuck at onboarding)'
  );
  assert.ok(
    !mainRoute.includes(".eq('email_verified', false)"),
    'main route must NOT query for email_verified=false'
  );
});

check('existing route on main filters by onboarding_step=0', () => {
  assert.ok(
    mainRoute.includes(".eq('onboarding_step', 0)"),
    'main route targets agents stuck at onboarding step 0'
  );
});

check('existing route on main uses bulkAll (not all) for bulk operations', () => {
  assert.ok(
    mainRoute.includes('bulkAll'),
    'main route uses bulkAll flag for bulk SMS sends'
  );
});

// Read the PR's replacement route to show the conflict
let prRoute;
try {
  prRoute = execSync(
    'git show f64995841fcebe588db65b25b138ef118dea11a9:product/lead-response/dashboard/app/api/admin/activation/route.ts',
    { encoding: 'utf8' }
  );
} catch {
  console.log('  SKIP: could not read PR commit route');
  process.exit(0);
}

check('PR route does NOT import sendSms (SMS nudge feature destroyed)', () => {
  assert.ok(
    !prRoute.includes('sendSms'),
    'PR route removes all SMS sending — the nudge feature is destroyed'
  );
});

check('PR route queries email_verified=false (opposite of existing)', () => {
  assert.ok(
    prRoute.includes(".eq('email_verified', false)"),
    'PR route flips the query to find unverified agents instead'
  );
});

check('PR route uses all flag instead of bulkAll (API contract broken)', () => {
  assert.ok(
    prRoute.includes('all') && !prRoute.includes('bulkAll'),
    'PR changes the bulk flag from bulkAll to all — breaks the existing page contract'
  );
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
