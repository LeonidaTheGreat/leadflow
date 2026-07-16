/**
 * E2E guard: Admin Email Verification Override
 * QC task: 8f456f1a-67dc-4988-9922-fcf4db7c7896 / PR #1879
 *
 * Verifies the feature is structurally sound and the build includes the
 * new route without regressions.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_ROOT = path.resolve(__dirname, '../../product/lead-response/dashboard');
const NEXT_BUILD = path.join(DASHBOARD_ROOT, '.next');

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  PASS  ${label}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${label}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

console.log('\n=== Admin Email Verification Override — E2E guard ===\n');

// ── 1. Required files exist ────────────────────────────────────────────────
check('API route file exists', () => {
  const f = path.join(DASHBOARD_ROOT, 'app/api/admin/verify-email/route.ts');
  assert.ok(fs.existsSync(f), `Missing: ${f}`);
});

check('Frontend page file exists', () => {
  const f = path.join(DASHBOARD_ROOT, 'app/admin/email-verification/page.tsx');
  assert.ok(fs.existsSync(f), `Missing: ${f}`);
});

check('Test file exists', () => {
  const f = path.join(DASHBOARD_ROOT, 'tests/admin-verify-email.test.ts');
  assert.ok(fs.existsSync(f), `Missing: ${f}`);
});

// ── 2. Route exports GET and POST ─────────────────────────────────────────
check('API route exports GET and POST', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD_ROOT, 'app/api/admin/verify-email/route.ts'),
    'utf8'
  );
  assert.ok(/export async function GET/.test(src), 'Missing export GET');
  assert.ok(/export async function POST/.test(src), 'Missing export POST');
});

// ── 3. Auth gate present on both methods ─────────────────────────────────
check('Auth guard (requireAdmin) on GET and POST', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD_ROOT, 'app/api/admin/verify-email/route.ts'),
    'utf8'
  );
  const matches = (src.match(/requireAdmin/g) || []).length;
  assert.ok(matches >= 2, `requireAdmin should appear ≥2 times, found ${matches}`);
});

// ── 4. No hardcoded secrets ───────────────────────────────────────────────
check('No hardcoded API keys in route', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD_ROOT, 'app/api/admin/verify-email/route.ts'),
    'utf8'
  );
  assert.ok(!/['"][A-Za-z0-9_-]{30,}['"]/.test(src), 'Potential hardcoded secret detected');
});

// ── 5. 400 on missing body param ─────────────────────────────────────────
check('POST validates agentId/all presence', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD_ROOT, 'app/api/admin/verify-email/route.ts'),
    'utf8'
  );
  assert.ok(/agentId or all required/.test(src), 'Missing 400 validation message');
  assert.ok(/status: 400/.test(src), 'Missing 400 status code');
});

// ── 6. Build output includes new route ───────────────────────────────────
check('Next.js build includes /admin/email-verification route', () => {
  const serverDir = path.join(NEXT_BUILD, 'server/app/admin/email-verification');
  assert.ok(
    fs.existsSync(serverDir),
    `Build output missing /admin/email-verification. Run "npm run build" in dashboard/.`
  );
});

check('Next.js build includes /api/admin/verify-email route', () => {
  const routeFile = path.join(NEXT_BUILD, 'server/app/api/admin/verify-email/route.js');
  assert.ok(
    fs.existsSync(routeFile),
    `Build output missing /api/admin/verify-email/route.js`
  );
});

// ── 7. Page has correct 'use client' and data-testid hooks ───────────────
check('Frontend page is a client component with testid hooks', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD_ROOT, 'app/admin/email-verification/page.tsx'),
    'utf8'
  );
  assert.ok(/'use client'/.test(src), "Missing 'use client' directive");
  assert.ok(/data-testid="verify-all-btn"/.test(src), 'Missing data-testid="verify-all-btn"');
  assert.ok(/data-testid="verify-email-table"/.test(src), 'Missing data-testid="verify-email-table"');
});

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
