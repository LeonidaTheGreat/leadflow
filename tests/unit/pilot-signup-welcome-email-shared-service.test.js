'use strict';

/**
 * Verifies that pilot-signup/route.ts:
 *  1. Imports sendWelcomeEmail from @/lib/email-service (not inline)
 *  2. Does NOT contain an inline sendWelcomeEmail implementation
 *  3. Calls sendWelcomeEmail with the shared service signature
 *  4. email-service.ts exports sendWelcomeEmail with agentId and planTier params
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, '../../product/lead-response/dashboard');
const pilotSignupFile = path.join(dashboardDir, 'app/api/auth/pilot-signup/route.ts');
const emailServiceFile = path.join(dashboardDir, 'lib/email-service.ts');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`  FAIL: ${name}: ${error.message}`);
    failed++;
  }
}

function run() {
  console.log('\n=== unit: pilot-signup uses shared sendWelcomeEmail from email-service ===\n');

  const pilotContent = fs.readFileSync(pilotSignupFile, 'utf8');
  const emailServiceContent = fs.readFileSync(emailServiceFile, 'utf8');

  check('pilot-signup imports sendWelcomeEmail from @/lib/email-service', () => {
    assert.ok(
      pilotContent.includes("import { sendWelcomeEmail } from '@/lib/email-service'") ||
      pilotContent.includes('import { sendWelcomeEmail } from "@/lib/email-service"'),
      'Expected import of sendWelcomeEmail from @/lib/email-service'
    );
  });

  check('pilot-signup does NOT contain inline sendWelcomeEmail function body', () => {
    const hasInlineImpl =
      pilotContent.includes("fetch('https://api.resend.com/emails'") ||
      pilotContent.includes('fetch("https://api.resend.com/emails"') ||
      /async function sendWelcomeEmail\s*\(email:\s*string,\s*name:\s*string\)/.test(pilotContent);
    assert.strictEqual(hasInlineImpl, false, 'Found inline sendWelcomeEmail — should use shared service');
  });

  check('pilot-signup calls sendWelcomeEmail with agentId as second argument', () => {
    assert.ok(
      pilotContent.includes('sendWelcomeEmail(agent.email, agent.id,'),
      'Expected sendWelcomeEmail(agent.email, agent.id, ...) call pattern'
    );
  });

  check('pilot-signup passes planTier: pilot to sendWelcomeEmail', () => {
    assert.ok(
      pilotContent.includes("planTier: 'pilot'"),
      "Expected planTier: 'pilot' in sendWelcomeEmail options"
    );
  });

  check('pilot-signup passes dashboardUrl to sendWelcomeEmail', () => {
    assert.ok(
      pilotContent.includes('dashboardUrl:'),
      'Expected dashboardUrl in sendWelcomeEmail options'
    );
  });

  check('email-service.ts exports sendWelcomeEmail', () => {
    assert.ok(
      emailServiceContent.includes('export async function sendWelcomeEmail'),
      'Expected export of sendWelcomeEmail in email-service.ts'
    );
  });

  check('email-service.ts sendWelcomeEmail accepts agentId as second param', () => {
    assert.ok(
      emailServiceContent.includes('agentId: string'),
      'Expected agentId: string parameter in sendWelcomeEmail'
    );
  });

  check('email-service.ts sendWelcomeEmail accepts WelcomeEmailData with planTier', () => {
    assert.ok(
      emailServiceContent.includes('planTier'),
      'Expected planTier in WelcomeEmailData'
    );
  });

  console.log(`\n  Passed: ${passed} / ${passed + failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
