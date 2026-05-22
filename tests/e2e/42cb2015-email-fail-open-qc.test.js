/**
 * QC E2E Test: fix-email-fail-open-missing-resend-api-key-returns-suc
 * Task ID: 42cb2015-f586-4327-a8a0-e7edabb0ee03
 *
 * Verifies the email-service.ts fix is correctly implemented:
 * - sendEmail() returns false (not true) when RESEND_API_KEY is missing
 * - The old fail-open silent-success log message is gone
 * - The fix does not break the success path structure
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

const EMAIL_SERVICE = path.join(
  __dirname,
  '../../product/lead-response/dashboard/lib/email-service.ts'
);

console.log('\n=== QC E2E: email fail-open fix (42cb2015) ===\n');

assert(fs.existsSync(EMAIL_SERVICE), `email-service.ts not found at: ${EMAIL_SERVICE}`);
const content = fs.readFileSync(EMAIL_SERVICE, 'utf8');

// 1. The fail-open branch must not silently return true
check('AC: no silent success — old "Email queued (Resend not configured)" log removed', () => {
  assert(
    !content.includes('Email queued (Resend not configured)'),
    'Fail-open log message still present. Silent success path was not removed.'
  );
});

// 2. The guard block must return false
check('AC: guard block returns false when resend is null', () => {
  // Find the null-check guard: "if (!resend)"
  const guardMatch = content.match(/if\s*\(\s*!resend\s*\)[\s\S]{0,300}/);
  assert(guardMatch, 'Could not find "if (!resend)" guard block in email-service.ts');
  const guardBlock = guardMatch[0];
  assert(
    guardBlock.includes('return false'),
    'Guard block does not contain "return false". Fix not applied correctly.'
  );
  assert(
    !guardBlock.includes('return true'),
    'Guard block still contains "return true". Fail-open not fixed.'
  );
});

// 3. The guard block must use logger.error (not console.log)
check('AC: guard block logs logger.error for missing key', () => {
  const guardMatch = content.match(/if\s*\(\s*!resend\s*\)[\s\S]{0,300}/);
  assert(guardMatch, 'Could not find "if (!resend)" guard block');
  const guardBlock = guardMatch[0];
  assert(
    guardBlock.includes('logger.error'),
    'Guard must call logger.error for missing key, not console.log'
  );
});

// 4. The RESEND_API_KEY error message must be present
check('AC: clear error message mentions RESEND_API_KEY', () => {
  assert(
    content.includes('RESEND_API_KEY not configured'),
    'Error message "RESEND_API_KEY not configured" is missing from the guard'
  );
});

// 5. The success path (actual Resend call) must still exist
check('Existing functionality intact: Resend .emails.send() call preserved', () => {
  assert(
    content.includes('resend.emails.send('),
    'Resend send call missing — success path may have been accidentally removed'
  );
});

// 6. logEmailEvent for the "queued" status is gone (the old silently-succeed path wrote to DB)
check('Old DB write on missing key removed (no queued logEmailEvent in guard)', () => {
  const guardIdx = content.indexOf('RESEND_API_KEY not configured');
  // The old code had logEmailEvent with status:'queued' right before the return true
  // It should no longer exist within ~400 chars of the guard
  const surrounding = content.slice(Math.max(0, guardIdx - 100), guardIdx + 300);
  assert(
    !surrounding.includes("status: 'queued'"),
    "Old 'queued' logEmailEvent still present in the guard block — not fully removed"
  );
});

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nFAIL: Email fail-open fix is incomplete or broken.\n');
  process.exit(1);
} else {
  console.log('\nPASS: Email fail-open fix verified.\n');
  process.exit(0);
}
