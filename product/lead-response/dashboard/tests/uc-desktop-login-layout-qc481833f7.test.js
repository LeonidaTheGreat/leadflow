/**
 * QC E2E Test: PR #1049 — Desktop login/signup page layout fix
 * QC Task ID: 481833f7-b7df-409f-972f-432c625ab54a
 *
 * Verifies acceptance criteria for fix-login-signup-layout-desktop-input-fields:
 * 1. Login input fields have h-12 w-full (properly sized for desktop)
 * 2. Signup input fields have h-12 w-full (all 4 fields)
 * 3. No overly-restrictive width constraints (max-w-xs etc.) on form inputs
 * 4. No hardcoded pixel widths that break responsiveness
 * 5. Input component does not apply md:text-sm which shrinks text on desktop
 *
 * This test is self-contained (source-level) and does not require a running server.
 */

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_ROOT = path.resolve(__dirname, '..');

function readFile(relPath) {
  const fullPath = path.join(DASHBOARD_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required file not found: ${relPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  PASS  ${label}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${label}: ${e.message}`);
    failed++;
  }
}

const loginPage = readFile('app/login/page.tsx');
const signupPage = readFile('app/signup/page.tsx');
const inputComponent = readFile('components/ui/input.tsx');

// --- Acceptance Criteria 1: Login inputs properly sized ---
check('Login: email input has h-12 w-full (desktop-safe height + full width)', () => {
  assert(loginPage.includes('h-12 w-full pl-10'), 'Login email input is missing h-12 w-full pl-10');
});

check('Login: password input has h-12 w-full pl-10 pr-10', () => {
  assert(loginPage.includes('h-12 w-full pl-10 pr-10'), 'Login password input is missing h-12 w-full pl-10 pr-10');
});

check('Login: both inputs have text-base (readable font size on desktop)', () => {
  const matches = [...loginPage.matchAll(/h-12 w-full[^"]*text-base/g)];
  assert(matches.length >= 2, `Expected >=2 inputs with h-12 w-full text-base, found ${matches.length}`);
});

// --- Acceptance Criteria 2: Signup inputs properly sized ---
check('Signup: 4 inputs with h-12 w-full text-base (email, name, phone, password)', () => {
  const matches = [...signupPage.matchAll(/className="h-12 w-full[^"]*text-base[^"]*"/g)];
  assert(matches.length >= 4, `Expected >=4 inputs with h-12 w-full text-base in signup, found ${matches.length}`);
});

// --- Acceptance Criteria 3: No overly-restrictive width constraints ---
check('Login: no max-w-xs on inputs or form (would cut off fields on desktop)', () => {
  // max-w-xs (20rem/320px) is fine for decorative elements but not form inputs
  // We verify the INPUT elements themselves are not wrapped in max-w-xs containers
  // The login card itself uses max-w-lg which is acceptable (32rem)
  assert(
    !loginPage.includes('className="max-w-xs'),
    'Found max-w-xs as a direct className — verify this is not on a form input wrapper'
  );
});

check('Login: form container uses max-w-lg or wider (adequate desktop width)', () => {
  const wideEnough = /max-w-(lg|xl|2xl|3xl|4xl|5xl|6xl|full)/.test(loginPage);
  assert(wideEnough, 'Login form container must use max-w-lg or wider to avoid cramped desktop layout');
});

check('Signup: form uses max-w-2xl or wider container for detail entry step', () => {
  const wideEnough = /max-w-(2xl|3xl|4xl|5xl|6xl|full)/.test(signupPage);
  assert(wideEnough, 'Signup form container must use max-w-2xl or wider for the detail entry step');
});

// --- Acceptance Criteria 4: No hardcoded pixel widths ---
check('Login: no hardcoded pixel widths via inline style on inputs', () => {
  const pixelWidths = loginPage.match(/style=\{[^}]*width:\s*['"]?\d+px/g);
  assert(!pixelWidths, `Login page has hardcoded pixel widths: ${JSON.stringify(pixelWidths)}`);
});

check('Signup: no hardcoded pixel widths via inline style on inputs', () => {
  const pixelWidths = signupPage.match(/style=\{[^}]*width:\s*['"]?\d+px/g);
  assert(!pixelWidths, `Signup page has hardcoded pixel widths: ${JSON.stringify(pixelWidths)}`);
});

// --- Acceptance Criteria 5: Input component does not shrink on desktop ---
check('Input component (ui/input.tsx): no md:text-sm override (would shrink desktop text)', () => {
  assert(
    !inputComponent.includes('md:text-sm'),
    'components/ui/input.tsx must not contain md:text-sm — it overrides text-base on desktop breakpoints'
  );
});

// --- Integrity checks ---
check('Login: data-testid attributes present for E2E targeting', () => {
  assert(
    loginPage.includes('data-testid="login-email-input"') &&
    loginPage.includes('data-testid="login-password-input"'),
    'Login page must preserve data-testid attributes'
  );
});

check('Signup: data-testid attributes present on form inputs', () => {
  assert(
    signupPage.includes('data-testid="signup-email-input"') &&
    signupPage.includes('data-testid="signup-password-input"'),
    'Signup page must preserve data-testid attributes'
  );
});

check('No hardcoded API secrets in login page (no sk_, pk_live, whsec_)', () => {
  assert(
    !loginPage.includes('sk_') &&
    !loginPage.includes('pk_live') &&
    !loginPage.includes('whsec_'),
    'Login page must not contain hardcoded API keys'
  );
});

const total = passed + failed;
console.log(`\n${'─'.repeat(60)}`);
console.log(`RESULT: ${passed}/${total} passed`);
console.log(`${'─'.repeat(60)}`);

if (failed > 0) {
  console.log('\nFAIL — desktop login/signup layout ACs not met');
  process.exit(1);
} else {
  console.log('\nPASS — desktop login/signup layout ACs verified');
  process.exit(0);
}
