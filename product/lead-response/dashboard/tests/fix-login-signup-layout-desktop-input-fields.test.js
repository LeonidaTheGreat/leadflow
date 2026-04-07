const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dashboardRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(dashboardRoot, relPath), 'utf8');
}

function expectIncludes(text, expected, message) {
  assert(text.includes(expected), message + `\nMissing: ${expected}`);
}

const loginPage = read('app/login/page.tsx');
const trialSignupForm = read('components/trial-signup-form.tsx');

// Acceptance criteria from the task:
// - desktop layout should be responsive vertical
// - input fields should be properly sized
// - login and signup flows should both be covered

expectIncludes(
  trialSignupForm,
  'className={`w-full max-w-2xl mx-auto ${className}`}',
  'Signup compact form container should expand to desktop-safe width.'
);
expectIncludes(
  trialSignupForm,
  'className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"',
  'Signup compact submit CTA should be full width to match the input stack.'
);
expectIncludes(
  loginPage,
  'className="h-12 w-full',
  'Login input should be explicitly full width with larger desktop height.'
);

console.log('PASS fix-login-signup-layout-desktop-input-fields');
