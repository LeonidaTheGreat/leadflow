'use strict';

/**
 * QC E2E test for uc-stripe-payment-link-direct
 * Verifies the dashboard admin payment-links page is correctly aligned with
 * the deployed API: correct endpoint, correct plan tiers, no leaking API key.
 * Run: node tests/uc-stripe-payment-link-direct.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

function readFile(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf-8');
}

let passed = 0;
let total = 0;

function check(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name} — ${err.message}`);
  }
}

const pageSrc = readFile('product/lead-response/dashboard/app/admin/payment-links/page.tsx');
const routeSrc = readFile('product/lead-response/dashboard/app/api/admin/create-payment-link/route.ts');

console.log('\n=== uc-stripe-payment-link-direct: admin payment link page contract ===\n');

check('page fetches /api/admin/payment-ready (not a stale or non-existent endpoint)', () => {
  assert.match(pageSrc, /fetch\(['"]\/api\/admin\/payment-ready['"]\)/);
  assert.doesNotMatch(pageSrc, /payment-link-candidates/);
});

check('page plan type is starter | pro | team', () => {
  assert.match(pageSrc, /type PlanTier = 'starter' \| 'pro' \| 'team'/);
  assert.doesNotMatch(pageSrc, /professional/);
  assert.doesNotMatch(pageSrc, /enterprise/);
});

check('page PLAN_TIERS array matches backend VALID_PLAN_TIERS', () => {
  // Extract backend valid tiers
  const backendMatch = routeSrc.match(/VALID_PLAN_TIERS\s*=\s*\[([^\]]+)\]/);
  assert.ok(backendMatch, 'Could not find VALID_PLAN_TIERS in create-payment-link route');
  const backendTiers = backendMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));

  // Extract frontend PLAN_TIERS
  const frontendMatch = pageSrc.match(/PLAN_TIERS:\s*PlanTier\[\]\s*=\s*\[([^\]]+)\]/);
  assert.ok(frontendMatch, 'Could not find PLAN_TIERS in page.tsx');
  const frontendTiers = frontendMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));

  assert.deepStrictEqual(frontendTiers, backendTiers,
    `Frontend tiers [${frontendTiers}] must match backend [${backendTiers}]`);
});

check('page prices match CLAUDE.md pricing tiers ($49/$149/$399)', () => {
  assert.match(pageSrc, /starter.*\$49\/mo/s);
  assert.match(pageSrc, /pro.*\$149\/mo/s);
  assert.match(pageSrc, /team.*\$399\/mo/s);
});

check('NEXT_PUBLIC_ADMIN_API_KEY is not sent in browser fetch calls', () => {
  // The page should rely on session auth, not a browser-exposed API key
  assert.doesNotMatch(pageSrc, /NEXT_PUBLIC_ADMIN_API_KEY/);
});

check('route validates planTier against VALID_PLAN_TIERS before processing', () => {
  // Ensure backend actually rejects unknown tiers
  assert.match(routeSrc, /VALID_PLAN_TIERS\.includes/);
});

check('create-payment-link route uses requireAdmin session auth', () => {
  assert.match(routeSrc, /requireAdmin/);
});

check('payment-ready route uses requireAdmin session auth', () => {
  const paymentReadySrc = readFile('product/lead-response/dashboard/app/api/admin/payment-ready/route.ts');
  assert.match(paymentReadySrc, /requireAdmin/);
});

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
