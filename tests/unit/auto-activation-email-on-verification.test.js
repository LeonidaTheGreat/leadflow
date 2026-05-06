'use strict';

/**
 * Unit test: Auto-Send Activation Email Within 1 Hour of Email Verification
 * UC: feat-auto-activation-email-on-verification
 *
 * Verifies that the verify-email route fires a post-verification activation email
 * immediately (fire-and-forget) after email_verified is set to true.
 *
 * These tests read source files directly — no DB or network required.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard');

function readDashboardFile(relPath) {
  return fs.readFileSync(path.join(DASHBOARD_DIR, relPath), 'utf8');
}

const results = { passed: 0, failed: 0, tests: [] };

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASSED: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'passed' });
  } catch (err) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   ${err.message}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', error: err.message });
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Unit Test: auto-activation-email-on-verification');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const verifyRoute = readDashboardFile('app/api/auth/verify-email/route.ts');
  const verificationLib = readDashboardFile('lib/verification-email.ts');

  // --- verify-email route: activation email is triggered ---

  await test('verify-email route imports sendActivationEmail', () => {
    assert.ok(
      verifyRoute.includes('sendActivationEmail'),
      'route.ts must import and call sendActivationEmail'
    );
  });

  await test('verify-email route calls sendActivationEmail only after successful token verification', () => {
    // sendActivationEmail must appear inside the success branch (result.success check)
    const successBlock = verifyRoute.slice(
      verifyRoute.indexOf('result.success'),
      verifyRoute.indexOf('Handle different error cases')
    );
    assert.ok(
      successBlock.includes('sendActivationEmail'),
      'sendActivationEmail must be called inside the result.success branch, not on error paths'
    );
  });

  await test('verify-email route calls sendActivationEmail fire-and-forget (non-blocking)', () => {
    // Must use .catch() — the redirect cannot be blocked by email delivery
    assert.ok(
      verifyRoute.includes('.catch('),
      'sendActivationEmail must use .catch() for fire-and-forget — do not block redirect on email'
    );
    // Must NOT await sendActivationEmail without also immediately redirecting
    const awaitSend = verifyRoute.includes('await sendActivationEmail');
    if (awaitSend) {
      // If awaited, the redirect must immediately follow (same try block at same level)
      // This is an unusual pattern — fire-and-forget with .catch() is preferred
      assert.fail('sendActivationEmail must not be awaited — use .catch() for fire-and-forget');
    }
  });

  await test('verify-email route checks activation_email_sent before sending (idempotent)', () => {
    assert.ok(
      verifyRoute.includes('activation_email_sent'),
      'route must check activation_email_sent to prevent duplicate sends'
    );
  });

  await test('verify-email route redirects to onboarding after triggering email (non-blocking)', () => {
    assert.ok(
      verifyRoute.includes('/onboarding'),
      'route must redirect to /onboarding after email verification'
    );
  });

  // --- verification-email.ts library: sendActivationEmail marks sent ---

  await test('sendActivationEmail function exists in verification-email.ts', () => {
    assert.ok(
      verificationLib.includes('export async function sendActivationEmail'),
      'sendActivationEmail must be exported from lib/verification-email.ts'
    );
  });

  await test('sendActivationEmail marks activation_email_sent = true after successful send', () => {
    assert.ok(
      verificationLib.includes('activation_email_sent: true'),
      'sendActivationEmail must update activation_email_sent = true in DB after email is sent'
    );
  });

  await test('sendActivationEmail only marks sent when email delivery succeeds', () => {
    const src = verificationLib;
    const fnStart = src.indexOf('export async function sendActivationEmail');
    const fnBody = src.slice(fnStart, fnStart + 8000);
    // activation_email_sent: true must appear after 'if (sent)' check
    const sentCheckIdx = fnBody.indexOf('if (sent)');
    const markSentIdx = fnBody.indexOf('activation_email_sent: true');
    assert.ok(sentCheckIdx > -1, 'sendActivationEmail must check if email was sent before marking');
    assert.ok(
      markSentIdx > sentCheckIdx,
      'activation_email_sent = true must only be set after confirming the email was sent'
    );
  });

  await test('sendActivationEmail links to /onboarding in email body', () => {
    assert.ok(
      verificationLib.includes('/onboarding'),
      'activation email must link to the /onboarding page as the CTA'
    );
  });

  await test('sendActivationEmail uses email_type activation for event logging', () => {
    assert.ok(
      verificationLib.includes("'activation'"),
      "sendActivationEmail must log email events with email_type='activation'"
    );
  });

  // --- Summary ---

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total:  ${results.tests.length}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Rate:   ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\nFailed:');
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }

  return results;
}

module.exports = { run, results };

if (require.main === module) {
  run().then(r => process.exit(r.failed > 0 ? 1 : 0)).catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}
