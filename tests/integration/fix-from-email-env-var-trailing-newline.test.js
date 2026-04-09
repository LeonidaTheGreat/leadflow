/**
 * Test: FROM_EMAIL and RESEND_API_KEY env vars trim trailing whitespace
 * Task: fix-from-email-env-var-has-trailing-newline-may-cause-
 *
 * Verifies that trailing newlines/whitespace in env var values do not
 * get passed to Resend, which would cause email delivery failures.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DASHBOARD_LIB = path.join(PROJECT_ROOT, 'product/lead-response/dashboard/lib');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Source file checks: verify .trim() is applied to FROM_EMAIL and RESEND_API_KEY
// ────────────────────────────────────────────────────────────────────────────

const filesToCheck = [
  { file: 'lib/email-service.ts', varName: 'FROM_EMAIL' },
  { file: 'lib/nps-email-service.ts', varName: 'FROM_EMAIL' },
  { file: 'lib/verification-email.ts', varName: 'FROM_EMAIL' },
  { file: 'lib/lead-magnet-email.ts', varName: 'FROM_EMAIL' },
  { file: 'lib/pilot-conversion-service.ts', varName: 'FROM_EMAIL' },
  { file: 'lib/pilot-conversion-service.ts', varName: 'RESEND_API_KEY' },
  { file: 'app/api/auth/pilot-signup/route.ts', varName: 'FROM_EMAIL' },
  { file: 'app/api/auth/pilot-signup/route.ts', varName: 'RESEND_API_KEY' },
  { file: 'app/api/webhooks/stripe/route.ts', varName: 'RESEND_API_KEY' },
];

for (const { file, varName } of filesToCheck) {
  const fullPath = path.join(DASHBOARD_LIB, '..', file);
  // nps-email-service.ts and verification-email.ts are in lib/
  const altPath = path.join(DASHBOARD_LIB, file.replace('lib/', ''));

  test(`${file} trims ${varName} from process.env`, () => {
    let content;
    try {
      content = fs.readFileSync(path.join(PROJECT_ROOT, 'product/lead-response/dashboard', file), 'utf8');
    } catch {
      throw new Error(`Could not read file: ${file}`);
    }

    // Look for patterns that assign FROM_EMAIL or RESEND_API_KEY without trim
    // These are the dangerous patterns:
    //   const FROM_EMAIL = process.env.FROM_EMAIL || 'xxx'   (no trim)
    //   const RESEND_API_KEY = process.env.RESEND_API_KEY    (no trim, no optional chaining with trim)

    if (varName === 'FROM_EMAIL') {
      // Should have .trim() on the FROM_EMAIL assignment
      const hasUntrimmedFromEmail = /const FROM_EMAIL\s*=\s*process\.env\.FROM_EMAIL\s*\|\|\s*['"][^'"]+['"]\s*(?!\.trim\(\))$/.test(
        content.replace(/\n/g, '§')
      );
      // Simpler check: the FROM_EMAIL line must contain .trim()
      const fromEmailLines = content.split('\n').filter(l => l.includes('FROM_EMAIL') && l.includes('process.env.FROM_EMAIL') && !l.includes('//'));
      for (const line of fromEmailLines) {
        assert.ok(
          line.includes('.trim()'),
          `FROM_EMAIL assignment in ${file} missing .trim(): ${line.trim()}`
        );
      }
    } else if (varName === 'RESEND_API_KEY') {
      // The RESEND_API_KEY usage that creates Resend client or stores the key must use .trim()
      const resendKeyLines = content.split('\n').filter(l =>
        l.includes('process.env.RESEND_API_KEY') &&
        !l.includes('if (!') &&
        !l.includes('//') &&
        (l.includes('new Resend') || l.includes('RESEND_API_KEY =') || l.includes('resendKey ='))
      );
      for (const line of resendKeyLines) {
        assert.ok(
          line.includes('.trim()') || line.includes('?.trim()'),
          `RESEND_API_KEY usage in ${file} missing .trim(): ${line.trim()}`
        );
      }
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Runtime behaviour check: simulate the fix
// ────────────────────────────────────────────────────────────────────────────

test('trim() removes trailing newline from FROM_EMAIL value', () => {
  const rawValue = 'onboarding@resend.dev\n';
  const cleaned = (rawValue || 'fallback@example.com').trim();
  assert.strictEqual(cleaned, 'onboarding@resend.dev');
  assert.ok(!cleaned.includes('\n'), 'Trailing newline should be removed');
});

test('trim() removes trailing newline from RESEND_API_KEY value', () => {
  const rawValue = 're_6SaxRPd9_7Z1wSbSbqKyks29aojSN1Kbg\n';
  const cleaned = rawValue?.trim();
  assert.strictEqual(cleaned, 're_6SaxRPd9_7Z1wSbSbqKyks29aojSN1Kbg');
  assert.ok(!cleaned.includes('\n'), 'Trailing newline should be removed');
});

test('trim() handles multiple types of whitespace', () => {
  const values = [
    'onboarding@resend.dev\n',
    'onboarding@resend.dev\r\n',
    'onboarding@resend.dev  ',
    '  onboarding@resend.dev',
    '\tonboarding@resend.dev\t',
  ];
  for (const v of values) {
    assert.strictEqual(v.trim(), 'onboarding@resend.dev', `trim() failed for: ${JSON.stringify(v)}`);
  }
});

test('trim() is safe on clean values (no side effects)', () => {
  const clean = 'onboarding@resend.dev';
  assert.strictEqual(clean.trim(), 'onboarding@resend.dev');
});

// ────────────────────────────────────────────────────────────────────────────
// lib/pilot-conversion-service.js check
// ────────────────────────────────────────────────────────────────────────────

test('lib/pilot-conversion-service.js trims FROM_EMAIL', () => {
  const content = fs.readFileSync(path.join(PROJECT_ROOT, 'lib/pilot-conversion-service.js'), 'utf8');
  const fromEmailLine = content.split('\n').find(l => l.includes('FROM_EMAIL') && l.includes('process.env.FROM_EMAIL') && !l.includes('//'));
  assert.ok(fromEmailLine, 'FROM_EMAIL assignment not found in lib/pilot-conversion-service.js');
  assert.ok(fromEmailLine.includes('.trim()'), `FROM_EMAIL missing .trim() in lib/pilot-conversion-service.js: ${fromEmailLine.trim()}`);
});

test('lib/pilot-conversion-service.js trims RESEND_API_KEY', () => {
  const content = fs.readFileSync(path.join(PROJECT_ROOT, 'lib/pilot-conversion-service.js'), 'utf8');
  const resendLine = content.split('\n').find(l => l.includes('RESEND_API_KEY') && l.includes('process.env.RESEND_API_KEY') && l.includes('=') && !l.includes('if (') && !l.includes('//'));
  assert.ok(resendLine, 'RESEND_API_KEY assignment not found in lib/pilot-conversion-service.js');
  assert.ok(resendLine.includes('.trim()'), `RESEND_API_KEY missing .trim() in lib/pilot-conversion-service.js: ${resendLine.trim()}`);
});

// ────────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────────

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
