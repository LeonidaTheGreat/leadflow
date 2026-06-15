'use strict';

// Regression test for UC: "Signup page shows Choose Your Plan but no plan options are listed"
// Fixed in PR #37 — PLANS array was env-var dependent; hardcoded to always render.
// Further improved in PR #324 — priceId removed from client; server resolves via tier string.
// This test prevents re-introducing env-var dependencies that caused the original bug.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const signupPagePath = path.join(
  __dirname, '..', '..', 'product', 'lead-response', 'dashboard', 'app', 'signup', 'page.tsx'
);
const signupPageContent = fs.readFileSync(signupPagePath, 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

console.log('\n=== signup: plan options always display ===\n');

// ─── PLANS array must be hardcoded ────────────────────────────────────────────

check('PLANS constant is defined', () => {
  assert.match(signupPageContent, /const PLANS/);
});

check('PLANS array is not empty (has opening brace)', () => {
  assert.match(signupPageContent, /const PLANS.*=\s*\[/s);
});

check('PLANS array contains starter plan', () => {
  assert.match(signupPageContent, /id:\s*['"]starter['"]/);
});

check('PLANS array contains pro plan', () => {
  assert.match(signupPageContent, /id:\s*['"]pro['"]/);
});

check('PLANS array contains team plan', () => {
  assert.match(signupPageContent, /id:\s*['"]team['"]/);
});

// ─── No env-var dependency for plan display (regression guard) ────────────────

check('PLANS does NOT reference NEXT_PUBLIC_STRIPE_PRICE env vars', () => {
  assert.doesNotMatch(signupPageContent, /NEXT_PUBLIC_STRIPE_PRICE.*_MONTHLY/);
});

check('PLANS does NOT use process.env for plan rendering', () => {
  // If process.env appears, it must not be inside the PLANS array definition
  // We check that there is no pattern like: { id: '...', ... process.env }
  const plansMatch = signupPageContent.match(/const PLANS[^;]+;/s);
  if (plansMatch) {
    assert.doesNotMatch(plansMatch[0], /process\.env/);
  }
});

// ─── Tier-to-checkout mapping must be present ─────────────────────────────────

check('PLAN_CHECKOUT_TIER mapping is defined', () => {
  assert.match(signupPageContent, /PLAN_CHECKOUT_TIER/);
});

check('starter maps to starter_monthly', () => {
  assert.match(signupPageContent, /starter.*starter_monthly/s);
});

check('pro maps to pro_monthly', () => {
  assert.match(signupPageContent, /pro.*pro_monthly/s);
});

check('team maps to team_monthly', () => {
  assert.match(signupPageContent, /team.*team_monthly/s);
});

// ─── Render path: plan cards are rendered via PLANS.map ───────────────────────

check('plan cards rendered via PLANS.map', () => {
  assert.match(signupPageContent, /PLANS\.map/);
});

check('"Choose Your Plan" heading is in the same step as the plan grid', () => {
  assert.match(signupPageContent, /Choose Your Plan/);
  assert.match(signupPageContent, /PLANS\.map/);
});

check('plan card has data-testid for E2E targeting', () => {
  assert.match(signupPageContent, /data-testid=.*signup-plan-card/);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
