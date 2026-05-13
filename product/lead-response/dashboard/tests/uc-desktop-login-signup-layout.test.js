'use strict';

/**
 * E2E test: Desktop login/signup page layout — input field sizing
 * Verifies that login and signup input fields have h-12 w-full text-base
 * classes applied so they render correctly on desktop viewports.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_ROOT = path.join(__dirname, '..');

function readSourceFile(relPath) {
  return fs.readFileSync(path.join(DASHBOARD_ROOT, relPath), 'utf8');
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

// Find the Input block that contains a given testid (className comes BEFORE testid in JSX)
function getInputClassForTestid(src, testid) {
  const idx = src.indexOf(`data-testid="${testid}"`);
  assert.ok(idx !== -1, `testid "${testid}" not found in source`);
  // Look backwards up to 600 chars for last className= occurrence
  const before = src.slice(Math.max(0, idx - 600), idx);
  const lastClassIdx = before.lastIndexOf('className="');
  assert.ok(lastClassIdx !== -1, `No className= found in the 600 chars before testid "${testid}"`);
  const afterClass = before.slice(lastClassIdx + 'className="'.length);
  const closeQuote = afterClass.indexOf('"');
  assert.ok(closeQuote !== -1, `Unclosed className= before testid "${testid}"`);
  return afterClass.slice(0, closeQuote);
}

// ── Login page ──────────────────────────────────────────────────────────────
const loginSrc = readSourceFile('app/login/page.tsx');

test('login email input has h-12 (adequate height)', () => {
  const cls = getInputClassForTestid(loginSrc, 'login-email-input');
  assert.ok(cls.includes('h-12'), `email input className missing h-12, got: "${cls}"`);
});

test('login email input has w-full (full container width)', () => {
  const cls = getInputClassForTestid(loginSrc, 'login-email-input');
  assert.ok(cls.includes('w-full'), `email input className missing w-full, got: "${cls}"`);
});

test('login email input has text-base (readable font size)', () => {
  const cls = getInputClassForTestid(loginSrc, 'login-email-input');
  assert.ok(cls.includes('text-base'), `email input className missing text-base, got: "${cls}"`);
});

test('login password input has h-12 w-full text-base', () => {
  const cls = getInputClassForTestid(loginSrc, 'login-password-input');
  assert.ok(cls.includes('h-12'), `password input missing h-12`);
  assert.ok(cls.includes('w-full'), `password input missing w-full`);
  assert.ok(cls.includes('text-base'), `password input missing text-base`);
});

test('login page has max-w container for desktop layout', () => {
  assert.ok(
    loginSrc.includes('max-w-lg') || loginSrc.includes('max-w-md') || loginSrc.includes('max-w-xl'),
    'login page should have a max-width container for desktop layout'
  );
});

// ── Signup page ─────────────────────────────────────────────────────────────
const signupSrc = readSourceFile('app/signup/page.tsx');

test('signup email input has h-12 w-full text-base', () => {
  const cls = getInputClassForTestid(signupSrc, 'signup-email-input');
  assert.ok(cls.includes('h-12'), `signup email input missing h-12`);
  assert.ok(cls.includes('w-full'), `signup email input missing w-full`);
  assert.ok(cls.includes('text-base'), `signup email input missing text-base`);
});

test('signup page wrapped in Suspense boundary (required for useSearchParams)', () => {
  assert.ok(
    signupSrc.includes('<Suspense'),
    'signup page must wrap inner component in <Suspense> since it uses useSearchParams()'
  );
});

test('signup page: useRouter not imported without use (dead import check)', () => {
  const importIdx = signupSrc.indexOf('useRouter');
  if (importIdx === -1) return; // not imported at all — fine
  // Must appear at least once after the import line
  const afterImport = signupSrc.slice(importIdx + 'useRouter'.length);
  assert.ok(
    afterImport.includes('useRouter'),
    'useRouter is imported in signup/page.tsx but never used — dead import (lint violation)'
  );
});

// ── Repo hygiene: no committed Playwright trace artifacts ───────────────────
test('no Playwright trace.zip artifacts in repo', () => {
  const repoRoot = path.join(DASHBOARD_ROOT, '..', '..', '..', '..');
  const traceDir = path.join(repoRoot, 'test-results');
  if (!fs.existsSync(traceDir)) return;
  function findZips(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const zips = [];
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) zips.push(...findZips(full));
      else if (e.name.endsWith('.zip')) zips.push(full);
    }
    return zips;
  }
  const zips = findZips(traceDir);
  assert.strictEqual(
    zips.length,
    0,
    `Committed Playwright trace artifacts found (should be gitignored): ${zips.slice(0, 3).join(', ')}`
  );
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('');
console.log('====================================================');
console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}`);
console.log(`📈 Pass Rate: ${(passed / (passed + failed) * 100).toFixed(0)}%`);
console.log('====================================================');

if (failed > 0) process.exit(1);
