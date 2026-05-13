/**
 * QC Build Verification Test: Desktop Login/Signup Page Layout Fix
 * PR #1049 — "Fix desktop login/signup page layout — input fields too small and cut off"
 *
 * Verifies:
 * 1. Source files contain the correct Tailwind sizing classes for desktop inputs
 * 2. The shared Input component does NOT apply md:text-sm (which shrinks text on desktop)
 * 3. No inline pixel widths that break responsiveness
 * 4. Auth flow imports are intact
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DASHBOARD_ROOT = path.resolve(__dirname, '..');

function readFile(relPath) {
  const fullPath = path.join(DASHBOARD_ROOT, relPath);
  assert(fs.existsSync(fullPath), `File must exist: ${relPath}`);
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

// 1. Input component: md:text-sm must NOT be present (it overrides text-base on desktop)
check('Input component: no md:text-sm shrink override', () => {
  assert(
    !inputComponent.includes('md:text-sm'),
    'components/ui/input.tsx must not have md:text-sm — it causes desktop text to shrink'
  );
});

// 2. Login page: both inputs (email + password) must have h-12 w-full text-base
check('Login email input: h-12 w-full text-base', () => {
  assert(
    loginPage.includes('h-12 w-full pl-10 bg-slate-900') &&
    loginPage.includes('text-base'),
    'Login email input must have h-12 w-full and text-base'
  );
});

check('Login password input: h-12 w-full pl-10 pr-10', () => {
  assert(
    loginPage.includes('h-12 w-full pl-10 pr-10'),
    'Login password input must have h-12 w-full pl-10 pr-10 (icon + show/hide toggle space)'
  );
});

check('Login page: at least 2 inputs with h-12 w-full sizing', () => {
  const matches = [...loginPage.matchAll(/className="h-12 w-full[^"]*"/g)];
  assert(matches.length >= 2, `Expected >= 2 inputs with h-12 w-full in login page, found ${matches.length}`);
});

// 3. Signup page: all 4 inputs must have h-12 w-full text-base
check('Signup page: at least 4 inputs with h-12 w-full', () => {
  const matches = [...signupPage.matchAll(/className="h-12 w-full[^"]*"/g)];
  assert(matches.length >= 4, `Expected >= 4 inputs with h-12 w-full in signup page, found ${matches.length}`);
});

check('Signup page: text-base present on inputs', () => {
  const matches = [...signupPage.matchAll(/h-12 w-full[^"]*text-base/g)];
  assert(matches.length >= 4, `Expected >= 4 inputs with text-base after h-12 w-full in signup, found ${matches.length}`);
});

// 4. No hardcoded pixel widths on inputs (would break responsiveness)
check('Login page: no hardcoded pixel widths on inputs', () => {
  const pixelWidths = loginPage.match(/style=\{[^}]*width:\s*['"]?\d+px/g);
  assert(!pixelWidths, `Login page has hardcoded pixel widths: ${JSON.stringify(pixelWidths)}`);
});

check('Signup page: no hardcoded pixel widths on inputs', () => {
  const pixelWidths = signupPage.match(/style=\{[^}]*width:\s*['"]?\d+px/g);
  assert(!pixelWidths, `Signup page has hardcoded pixel widths: ${JSON.stringify(pixelWidths)}`);
});

// 5. Auth flow integrity: critical imports still present
check('Login page: Input component imported from ui/input', () => {
  assert(loginPage.includes("from '@/components/ui/input'"), 'Login page must import Input from ui/input');
});

check('Login page: data-testid attributes present on inputs', () => {
  assert(
    loginPage.includes('data-testid="login-email-input"') &&
    loginPage.includes('data-testid="login-password-input"'),
    'Login page must preserve data-testid attributes for E2E test targeting'
  );
});

check('Signup page: data-testid present on key inputs', () => {
  assert(
    signupPage.includes('data-testid="signup-email-input"') &&
    signupPage.includes('data-testid="signup-password-input"'),
    'Signup page must preserve data-testid attributes for E2E test targeting'
  );
});

// 6. No secrets or hardcoded API keys
check('Login page: no hardcoded API keys or secrets', () => {
  const secretPatterns = /['"][A-Za-z0-9_\-]{20,}['"]\s*[,;]/g;
  const suspiciousMatches = [...loginPage.matchAll(secretPatterns)]
    .filter(m => !m[0].includes('placeholder') && !m[0].includes('className'));
  // Known safe patterns are short strings; actual secrets are long base64-like strings not in className
  assert(
    !loginPage.includes('sk_') && !loginPage.includes('pk_live') && !loginPage.includes('whsec_'),
    'Login page must not contain hardcoded API keys (sk_, pk_live, whsec_)'
  );
});

console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
