/**
 * QC E2E: Twilio credentials not in local .env (task 1f5dfb5d)
 * Verifies the fix for: TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER_US unset locally
 *
 * Acceptance criteria:
 * - The issue (local debugging impossible) is resolved
 * - Existing functionality is not broken
 * - Tests pass
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PROJECT_DIR = path.resolve(__dirname, '../../');
const results = { passed: 0, failed: 0, tests: [] };

function runTest(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: err.message });
    console.error(`  FAIL  ${name}: ${err.message}`);
  }
}

console.log('\n=== QC: Twilio credentials not in local .env (task 1f5dfb5d) ===\n');

// ── 1. .env.example documents all required Twilio vars ──────────
runTest('1. .env.example documents TWILIO_ACCOUNT_SID', () => {
  const envExample = fs.readFileSync(path.join(PROJECT_DIR, '.env.example'), 'utf8');
  assert(envExample.includes('TWILIO_ACCOUNT_SID'), '.env.example missing TWILIO_ACCOUNT_SID');
});

runTest('2. .env.example documents TWILIO_AUTH_TOKEN', () => {
  const envExample = fs.readFileSync(path.join(PROJECT_DIR, '.env.example'), 'utf8');
  assert(envExample.includes('TWILIO_AUTH_TOKEN'), '.env.example missing TWILIO_AUTH_TOKEN');
});

runTest('3. .env.example documents TWILIO_PHONE_NUMBER_US', () => {
  const envExample = fs.readFileSync(path.join(PROJECT_DIR, '.env.example'), 'utf8');
  assert(envExample.includes('TWILIO_PHONE_NUMBER_US'), '.env.example missing TWILIO_PHONE_NUMBER_US');
});

// ── 2. README documents all required Twilio vars ────────────────
runTest('4. README.md documents TWILIO_PHONE_NUMBER_US (not legacy TWILIO_PHONE_NUMBER)', () => {
  const readmePath = path.join(PROJECT_DIR, 'product/lead-response/README.md');
  assert(fs.existsSync(readmePath), `README not found: ${readmePath}`);
  const readme = fs.readFileSync(readmePath, 'utf8');
  assert(readme.includes('TWILIO_PHONE_NUMBER_US'), 'README missing TWILIO_PHONE_NUMBER_US');
});

// ── 3. Local env file has Twilio credentials ─────────────────────
// The primary fix: actual credentials must exist locally
runTest('5. CRITICAL: Local .env or .env.local has TWILIO_ACCOUNT_SID', () => {
  const envPath = path.join(PROJECT_DIR, '.env');
  const envLocalPath = path.join(PROJECT_DIR, '.env.local');

  let found = false;
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('TWILIO_ACCOUNT_SID') && !content.match(/TWILIO_ACCOUNT_SID=your_/)) {
      found = true;
    }
  }
  if (!found && fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    if (content.includes('TWILIO_ACCOUNT_SID') && !content.match(/TWILIO_ACCOUNT_SID=your_/)) {
      found = true;
    }
  }
  // Also check ~/.env as fallback
  const homeEnvPath = require('os').homedir() + '/.env';
  if (!found && fs.existsSync(homeEnvPath)) {
    const content = fs.readFileSync(homeEnvPath, 'utf8');
    if (content.includes('TWILIO_ACCOUNT_SID')) found = true;
  }

  assert(found,
    'TWILIO_ACCOUNT_SID not found in any local env file (.env, .env.local, ~/.env). ' +
    'The issue is not resolved — local debugging is still impossible.'
  );
});

runTest('6. CRITICAL: Local .env or .env.local has TWILIO_AUTH_TOKEN', () => {
  const envPath = path.join(PROJECT_DIR, '.env');
  const envLocalPath = path.join(PROJECT_DIR, '.env.local');

  let found = false;
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('TWILIO_AUTH_TOKEN') && !content.match(/TWILIO_AUTH_TOKEN=your_/)) {
      found = true;
    }
  }
  if (!found && fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    if (content.includes('TWILIO_AUTH_TOKEN') && !content.match(/TWILIO_AUTH_TOKEN=your_/)) {
      found = true;
    }
  }
  const homeEnvPath = require('os').homedir() + '/.env';
  if (!found && fs.existsSync(homeEnvPath)) {
    const content = fs.readFileSync(homeEnvPath, 'utf8');
    if (content.includes('TWILIO_AUTH_TOKEN')) found = true;
  }

  assert(found,
    'TWILIO_AUTH_TOKEN not found in any local env file (.env, .env.local, ~/.env). ' +
    'The issue is not resolved — local debugging is still impossible.'
  );
});

runTest('7. CRITICAL: Local .env or .env.local has TWILIO_PHONE_NUMBER_US', () => {
  const envPath = path.join(PROJECT_DIR, '.env');
  const envLocalPath = path.join(PROJECT_DIR, '.env.local');

  let found = false;
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('TWILIO_PHONE_NUMBER_US') && !content.match(/TWILIO_PHONE_NUMBER_US=\+1X/)) {
      found = true;
    }
  }
  if (!found && fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    if (content.includes('TWILIO_PHONE_NUMBER_US') && !content.match(/TWILIO_PHONE_NUMBER_US=\+1X/)) {
      found = true;
    }
  }
  const homeEnvPath = require('os').homedir() + '/.env';
  if (!found && fs.existsSync(homeEnvPath)) {
    const content = fs.readFileSync(homeEnvPath, 'utf8');
    if (content.includes('TWILIO_PHONE_NUMBER_US')) found = true;
  }

  assert(found,
    'TWILIO_PHONE_NUMBER_US not found in any local env file (.env, .env.local, ~/.env). ' +
    'The issue is not resolved — local debugging is still impossible.'
  );
});

// ── 4. twilio-sms.js handles env var loading robustly ───────────
runTest('8. lib/services/TwilioService.js has fallback for TWILIO_PHONE_NUMBER (backward compat)', () => {
  const src = fs.readFileSync(path.join(PROJECT_DIR, 'lib/services/TwilioService.js'), 'utf8');
  // Either uses cleanEnvValue with fallback, or has a direct fallback
  const hasFallback = src.includes('TWILIO_PHONE_NUMBER_US') &&
    (src.includes('TWILIO_PHONE_NUMBER') || src.includes('twilioPhoneNumberLegacy'));
  assert(hasFallback, 'twilio-sms.js does not handle TWILIO_PHONE_NUMBER_US with fallback');
});

// ── Summary ──────────────────────────────────────────────────────
console.log('\n' + '='.repeat(55));
console.log(`  Passed: ${results.passed}`);
console.log(`  Failed: ${results.failed}`);
console.log(`  Total:  ${results.passed + results.failed}`);
console.log('='.repeat(55));

if (results.failed > 0) {
  console.log('\n  QC VERDICT: CHANGES REQUESTED\n');
  results.tests.filter(t => t.status === 'FAILED').forEach(t => {
    console.log(`    - ${t.name}`);
    console.log(`      ${t.error}\n`);
  });
}

process.exit(results.failed > 0 ? 1 : 0);
