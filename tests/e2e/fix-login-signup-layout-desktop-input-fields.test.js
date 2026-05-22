// E2E: Verify login/signup desktop layout fix — input fields sized correctly
// UC: cb371c2a-6c22-43cb-a8d2-aa3c2a69f924
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dashboardRoot = require('path').resolve(__dirname, '../../product/lead-response/dashboard');

function read(relPath) {
  return fs.readFileSync(path.join(dashboardRoot, relPath), 'utf8');
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

const loginPage = read('app/login/page.tsx');
const signupPage = read('app/signup/page.tsx');

// Login: both inputs have h-12 w-full text-base
check('Login email input: h-12 w-full text-base present', () => {
  const matches = [...loginPage.matchAll(/className="h-12 w-full[^"]*text-base[^"]*"/g)];
  assert(matches.length >= 2, `Expected at least 2 inputs with h-12 w-full text-base, found ${matches.length}`);
});

check('Login email input has pl-10', () => {
  assert(loginPage.includes('h-12 w-full pl-10'), 'Email input missing pl-10 prefix spacing');
});

check('Login password input has pl-10 pr-10', () => {
  assert(loginPage.includes('h-12 w-full pl-10 pr-10'), 'Password input missing pl-10 pr-10 spacing');
});

// Signup: all 4 inputs (email, name, phone, password) have h-12 w-full text-base
check('Signup page: 4 inputs with h-12 w-full text-base', () => {
  const matches = [...signupPage.matchAll(/className="h-12 w-full[^"]*text-base[^"]*"/g)];
  assert(matches.length >= 4, `Expected at least 4 inputs with h-12 w-full text-base in signup, found ${matches.length}`);
});

// Neither file introduced hardcoded pixel widths that could break responsiveness
check('Login page: no hardcoded pixel width on inputs', () => {
  const pixelWidths = loginPage.match(/style=\{[^}]*width:\s*['"]?\d+px/g);
  assert(!pixelWidths, `Found hardcoded pixel widths: ${pixelWidths}`);
});

check('Signup page: no hardcoded pixel width on inputs', () => {
  const pixelWidths = signupPage.match(/style=\{[^}]*width:\s*['"]?\d+px/g);
  assert(!pixelWidths, `Found hardcoded pixel widths: ${pixelWidths}`);
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
