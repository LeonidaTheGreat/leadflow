'use strict';

/**
 * Unit tests for feat-auto-activation-email-on-verification
 *
 * Verifies that the verify-email route:
 *  1. Calls sendActivationEmail immediately after successful email verification
 *  2. Sends fire-and-forget (does not block the redirect on email delivery)
 *  3. Skips sending if activation_email_sent is already true (idempotent)
 *  4. Passes the correct arguments (email, agentId, firstName)
 *
 * Also validates that verification-email.ts:
 *  5. Marks activation_email_sent = true after a successful send
 *  6. Logs email events with type 'activation'
 *  7. Does NOT mark activation_email_sent if email send fails
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, '../../product/lead-response/dashboard');
const verifyRouteFile = path.join(dashboardDir, 'app/api/auth/verify-email/route.ts');
const verificationLibFile = path.join(dashboardDir, 'lib/verification-email.ts');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`  FAIL: ${name}: ${error.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== unit: auto-activation-email-on-verification ===\n');

  const routeSource = fs.readFileSync(verifyRouteFile, 'utf8');
  const libSource = fs.readFileSync(verificationLibFile, 'utf8');

  // ── verify-email route ────────────────────────────────────────────────────

  await check('route imports sendActivationEmail from verification-email lib', () => {
    assert.ok(
      routeSource.includes('sendActivationEmail') &&
        routeSource.includes('@/lib/verification-email'),
      'Route must import sendActivationEmail from @/lib/verification-email'
    );
  });

  await check('route calls sendActivationEmail after successful token verification', () => {
    // The call should appear in the success branch (after verifyEmailToken returns success)
    const successBranchIdx = routeSource.indexOf('result.success && result.agentId');
    assert.ok(successBranchIdx !== -1, 'Route must have a success branch for result.agentId');
    const afterSuccess = routeSource.slice(successBranchIdx);
    assert.ok(
      afterSuccess.includes('sendActivationEmail'),
      'sendActivationEmail must be called in the success branch'
    );
  });

  await check('route uses fire-and-forget pattern (.catch) for activation email', () => {
    assert.ok(
      routeSource.includes('sendActivationEmail') && routeSource.includes('.catch('),
      'sendActivationEmail must use .catch() for fire-and-forget error handling'
    );
  });

  await check('route checks !activation_email_sent before sending (idempotent)', () => {
    assert.ok(
      routeSource.includes('activation_email_sent'),
      'Route must check activation_email_sent flag before sending'
    );
    assert.ok(
      routeSource.includes('!agent.activation_email_sent'),
      'Route must guard with !agent.activation_email_sent to prevent duplicate sends'
    );
  });

  await check('route passes email, agentId, and firstName to sendActivationEmail', () => {
    assert.ok(
      routeSource.includes('agent.email') && routeSource.includes('result.agentId') &&
        routeSource.includes('agent.first_name'),
      'Route must pass agent.email, result.agentId, and agent.first_name to sendActivationEmail'
    );
  });

  await check('route redirects to /onboarding on success (not blocked by email)', () => {
    // Redirect should be AFTER the fire-and-forget call, not inside it
    const redirectIdx = routeSource.indexOf("'/onboarding'");
    const activationCallIdx = routeSource.indexOf('sendActivationEmail(agent.email');
    assert.ok(redirectIdx !== -1, 'Route must redirect to /onboarding');
    assert.ok(
      activationCallIdx !== -1 && activationCallIdx < redirectIdx,
      'sendActivationEmail call must appear before the redirect statement'
    );
  });

  await check('route does not await sendActivationEmail (fire-and-forget)', () => {
    // The activation email call must NOT be awaited
    const awaitCallPattern = /await\s+sendActivationEmail\(/;
    const isAwaited = awaitCallPattern.test(routeSource);
    assert.ok(!isAwaited, 'sendActivationEmail must NOT be awaited — it is fire-and-forget');
  });

  // ── verification-email.ts library ────────────────────────────────────────

  await check('sendActivationEmail marks activation_email_sent = true after successful send', () => {
    assert.ok(
      libSource.includes('activation_email_sent: true'),
      'sendActivationEmail must set activation_email_sent = true after successful email send'
    );
    // The update must be conditional on a successful send
    const updateIdx = libSource.indexOf('activation_email_sent: true');
    const sentCheckBefore = libSource.slice(0, updateIdx);
    assert.ok(
      sentCheckBefore.includes('if (sent)') || sentCheckBefore.includes('if(sent)'),
      'activation_email_sent must only be set when the email was actually sent'
    );
  });

  await check('sendActivationEmail logs email event with type activation', () => {
    // The function calls logEmailEvent with email_type: 'activation'
    assert.ok(
      libSource.includes("'activation'"),
      "sendActivationEmail must log email events with type 'activation'"
    );
  });

  await check('sendActivationEmail does NOT mark sent when email delivery fails', () => {
    // The update is inside if(sent) — only runs on success
    const ifSentIdx = libSource.indexOf('if (sent)');
    const updateIdx = libSource.indexOf('activation_email_sent: true');
    assert.ok(
      ifSentIdx !== -1 && updateIdx !== -1 && ifSentIdx < updateIdx,
      'activation_email_sent = true must be inside the if(sent) block'
    );
  });

  await check('sendActivationEmail is exported from verification-email lib', () => {
    assert.ok(
      libSource.includes('export async function sendActivationEmail'),
      'sendActivationEmail must be exported from verification-email.ts'
    );
  });

  await check('verification-email route file exists and is readable', () => {
    assert.ok(fs.existsSync(verifyRouteFile), 'verify-email/route.ts must exist');
    assert.ok(fs.existsSync(verificationLibFile), 'lib/verification-email.ts must exist');
  });

  // ── batch backfill endpoint ───────────────────────────────────────────────

  await check('batch send-activation-emails endpoint exists for backfilling historical agents', () => {
    const batchEndpoint = path.join(
      dashboardDir,
      'app/api/internal/send-activation-emails/route.ts'
    );
    assert.ok(
      fs.existsSync(batchEndpoint),
      'Batch activation email endpoint must exist for backfilling verified agents who missed the trigger'
    );
    const batchSource = fs.readFileSync(batchEndpoint, 'utf8');
    assert.ok(
      batchSource.includes('activation_email_sent'),
      'Batch endpoint must check activation_email_sent to avoid duplicate sends'
    );
    assert.ok(
      batchSource.includes('email_verified'),
      'Batch endpoint must only target email_verified agents'
    );
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
