/**
 * E2E Regression Test: fix-email-fail-open-missing-resend-api-key-returns-suc
 * Task ID: 547cdd93-6c7e-4155-8e55-9dd433b1e6c1
 *
 * Verifies that email-service.ts does NOT silently return true when
 * RESEND_API_KEY is missing. PRD AC7: missing key must produce a clear
 * failure, not a silent success.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

const EMAIL_SERVICE = path.join(
  __dirname,
  '../../product/lead-response/dashboard/lib/email-service.ts'
);

console.log('\n=== Regression: email fail-open fix ===\n');

const content = fs.readFileSync(EMAIL_SERVICE, 'utf8');

// AC1: The old silent-success path must be gone
check('does NOT return true when RESEND_API_KEY is missing', () => {
  // The old pattern was: if (!resend) { ... return true }
  // We look for `return true` inside the !resend guard block.
  // Simplest reliable check: the "queued (Resend not configured)" log message is gone.
  assert(
    !content.includes('Email queued (Resend not configured)'),
    'Old fail-open log message still present — silent success path not removed'
  );
});

// AC2: The function must return false (failure) when key is missing
check('returns false when RESEND_API_KEY is missing', () => {
  // Verify the new guard: if (!resend) { ... return false }
  // We check the block around the RESEND_API_KEY error message.
  assert(
    content.includes('RESEND_API_KEY not configured'),
    'New error message missing — fail-open guard not implemented'
  );

  // Confirm the guard actually returns false, not true
  const guardIdx = content.indexOf('RESEND_API_KEY not configured');
  const surrounding = content.slice(Math.max(0, guardIdx - 200), guardIdx + 200);
  assert(
    surrounding.includes('return false'),
    'Guard block must contain "return false" near the RESEND_API_KEY error'
  );
  assert(
    !surrounding.includes('return true'),
    'Guard block must NOT contain "return true" near the RESEND_API_KEY error'
  );
});

// AC3: The fix must log an error (not a success message)
check('logs console.error (not console.log) for missing key', () => {
  const guardIdx = content.indexOf('RESEND_API_KEY not configured');
  const surrounding = content.slice(Math.max(0, guardIdx - 200), guardIdx + 200);
  assert(
    surrounding.includes('console.error'),
    'Missing key must produce console.error, not console.log'
  );
});

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
