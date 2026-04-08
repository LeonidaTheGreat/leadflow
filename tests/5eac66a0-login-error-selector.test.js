/**
 * E2E test: PR #1036 — Login error selector uses data-testid
 *
 * Verifies that:
 * 1. The login page HTML contains the `data-testid="login-error-message"` attribute
 *    that the Playwright spec now targets.
 * 2. The old brittle `[class*="red"]` selector is no longer relied upon in the test file.
 * 3. The updated test file references the correct testId string.
 *
 * Runs without a browser — reads the source files directly.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── 1. Verify the data-testid attribute exists in the login page source ─────
const loginPage = path.join(ROOT, 'product/lead-response/dashboard/app/login/page.tsx');
const loginSource = fs.readFileSync(loginPage, 'utf8');
assert.ok(
  loginSource.includes('data-testid="login-error-message"'),
  'login/page.tsx must have data-testid="login-error-message" on the error div'
);
console.log('✅ data-testid="login-error-message" found in login/page.tsx');

// ── 2. Verify the Playwright spec targets the new testId ───────────────────
const specFile = path.join(ROOT, 'tests/browser/auth.spec.js');
const specSource = fs.readFileSync(specFile, 'utf8');
assert.ok(
  specSource.includes("getByTestId('login-error-message')"),
  'auth.spec.js must use getByTestId("login-error-message")'
);
console.log('✅ auth.spec.js uses getByTestId("login-error-message")');

// ── 3. The old brittle selector must be gone ──────────────────────────────
assert.ok(
  !specSource.includes('[class*="red"]'),
  'auth.spec.js must NOT use the brittle [class*="red"] selector'
);
console.log('✅ Brittle [class*="red"] selector removed from auth.spec.js');

// ── 4. Timeout is at least 20000ms for the cold-start case ────────────────
const timeoutMatch = specSource.match(/login-error-message[\s\S]*?timeout:\s*(\d+)/);
assert.ok(timeoutMatch, 'Timeout setting must be present near login-error-message assertion');
const timeout = parseInt(timeoutMatch[1], 10);
assert.ok(timeout >= 20000, `Timeout must be >= 20000ms to handle Vercel cold starts (got ${timeout})`);
console.log(`✅ Timeout is ${timeout}ms — adequate for cold starts`);

// ── 5. data-testid is in the JS bundle (error div is conditionally rendered) ──
// The static HTML won't contain it; check the JS chunks instead
const nextDir = path.join(ROOT, 'product/lead-response/dashboard/.next');
if (fs.existsSync(nextDir)) {
  // Scan all .js files under .next for the testid string
  function findInDir(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        if (findInDir(full)) return true;
      } else if (entry.endsWith('.js')) {
        if (fs.readFileSync(full, 'utf8').includes('login-error-message')) return true;
      }
    }
    return false;
  }
  const found = findInDir(nextDir);
  assert.ok(found, '"login-error-message" must appear in the Next.js JS bundle');
  console.log('✅ login-error-message present in Next.js JS bundle');
} else {
  console.log('⚠️  .next dir not found — skipping bundle check (run build first)');
}

console.log('\n✅ All checks passed — PR #1036 selector fix is correct');
