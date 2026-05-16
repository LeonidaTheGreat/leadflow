'use strict';

/**
 * Unit tests for fix-signup-to-activated-rate
 *
 * Verifies:
 * 1. trial-emails.ts queries plan_tier='trial' (not subscription_status='trial')
 * 2. send-trial-emails cron GET handler runs the email sequence (not just health check)
 * 3. Trial signup sets plan_tier='trial' consistently
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`    ${err.message}`);
  }
}

console.log('\n=== unit: trial-email-cron-activation-fix ===\n');

// Test 1: trial-emails.ts uses plan_tier not subscription_status
const trialEmailsPath = path.join(DASHBOARD_DIR, 'lib/trial-emails.ts');
const trialEmailsSrc = fs.readFileSync(trialEmailsPath, 'utf-8');

test('trial-emails.ts queries plan_tier=trial for agent eligibility', () => {
  assert.ok(
    trialEmailsSrc.includes(".eq('plan_tier', 'trial')"),
    'getTrialAgents() must filter on plan_tier=trial'
  );
});

test('trial-emails.ts does NOT query subscription_status=trial', () => {
  assert.ok(
    !trialEmailsSrc.includes(".eq('subscription_status', 'trial')"),
    'getTrialAgents() must NOT filter on subscription_status=trial (field is not set by trial-signup)'
  );
});

// Test 2: send-trial-emails cron GET handler runs the sequence
const cronRoutePath = path.join(DASHBOARD_DIR, 'app/api/cron/send-trial-emails/route.ts');
const cronRouteSrc = fs.readFileSync(cronRoutePath, 'utf-8');

test('cron GET handler calls sendActiveTrialSequence', () => {
  const getHandlerStart = cronRouteSrc.indexOf('export async function GET');
  assert.ok(getHandlerStart !== -1, 'GET handler must exist');
  const getHandlerBody = cronRouteSrc.slice(getHandlerStart);
  assert.ok(
    getHandlerBody.includes('sendActiveTrialSequence'),
    'GET handler must call sendActiveTrialSequence() (Vercel Cron sends GET)'
  );
});

test('cron GET handler verifies CRON_SECRET', () => {
  const getHandlerStart = cronRouteSrc.indexOf('export async function GET');
  const getHandlerBody = cronRouteSrc.slice(getHandlerStart);
  assert.ok(
    getHandlerBody.includes('CRON_SECRET') || getHandlerBody.includes('cronSecret'),
    'GET handler must verify CRON_SECRET for authentication'
  );
});

test('cron GET handler is not just a health check', () => {
  const getHandlerStart = cronRouteSrc.indexOf('export async function GET');
  const getHandlerBody = cronRouteSrc.slice(getHandlerStart);
  assert.ok(
    !getHandlerBody.match(/return\s+NextResponse\.json\(\s*\{\s*message:\s*'Trial email cron endpoint'/),
    'GET handler must not just return a static health check message'
  );
});

// Test 3: trial-signup sets plan_tier=trial
const trialSignupPath = path.join(DASHBOARD_DIR, 'app/api/auth/trial-signup/route.ts');
const trialSignupSrc = fs.readFileSync(trialSignupPath, 'utf-8');

test('trial-signup sets plan_tier to trial', () => {
  assert.ok(
    trialSignupSrc.includes("plan_tier: 'trial'"),
    'Trial signup must set plan_tier=trial in the agent record'
  );
});

test('trial-signup sets email_verified to true (no verification gate)', () => {
  assert.ok(
    trialSignupSrc.includes('email_verified: true'),
    'Trial signup must set email_verified=true (frictionless trial per PRD)'
  );
});

console.log(`\nResults: ${passed}/${total} passed\n`);
if (passed !== total) process.exit(1);
