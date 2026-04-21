'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const CREATE_CHECKOUT = path.join(
  __dirname, '../../product/lead-response/dashboard/app/api/billing/create-checkout/route.ts'
);
const UPGRADE_CHECKOUT = path.join(
  __dirname, '../../product/lead-response/dashboard/app/api/stripe/upgrade-checkout/route.ts'
);

let passed = 0;
let failed = 0;

function pass(name) { console.log(`  ✅ PASS: ${name}`); passed++; }
function fail(name, reason) { console.error(`  ❌ FAIL: ${name} — ${reason}`); failed++; }
function check(name, fn) { try { fn(); pass(name); } catch (e) { fail(name, e.message); } }

console.log('\n🧪 Unit Tests: Checkout Price ID Validation\n');

const createCheckoutSrc = fs.readFileSync(CREATE_CHECKOUT, 'utf8');
const regexMatch = createCheckoutSrc.match(/\/(\^price_\[A-Za-z0-9\]\{[^}]+\}\$)\//);
const priceRegex = regexMatch ? new RegExp(regexMatch[1]) : null;

check('Price ID regex can be extracted from create-checkout route', () => {
  assert.ok(priceRegex, 'Could not extract regex from source');
});

check('Regex accepts valid Stripe price IDs', () => {
  const validIds = [
    'price_1QvIEf2eZvKYlo2CkuDLQABG',
    'price_ABC123DEF456GH',
    'price_abcdefghijklmnopqr',
    'price_12345678901234',
  ];
  for (const id of validIds) {
    assert.ok(priceRegex.test(id), `Should accept: ${id}`);
  }
});

check('Regex rejects placeholder/invalid price IDs', () => {
  const invalidIds = [
    'price_starter_49',
    'price_pro_149',
    'price_team_399',
    'price_starter_monthly',
    'price_professional_monthly',
    'price_enterprise_monthly',
    'not_a_price_id',
    '',
    'price_',
    'price_short',
  ];
  for (const id of invalidIds) {
    assert.ok(!priceRegex.test(id), `Should reject: ${id}`);
  }
});

check('Regex has no space in quantifier (the original bug)', () => {
  assert.ok(
    !createCheckoutSrc.includes('{14 }'),
    'Found broken regex {14 } — space in quantifier'
  );
});

console.log('\n── Upgrade Checkout Route ──');

const upgradeCheckoutSrc = fs.readFileSync(UPGRADE_CHECKOUT, 'utf8');

check('Upgrade checkout has no placeholder price ID fallbacks', () => {
  assert.ok(
    !upgradeCheckoutSrc.includes("'price_starter_monthly'"),
    'Still has placeholder price_starter_monthly'
  );
  assert.ok(
    !upgradeCheckoutSrc.includes("'price_professional_monthly'"),
    'Still has placeholder price_professional_monthly'
  );
  assert.ok(
    !upgradeCheckoutSrc.includes("'price_enterprise_monthly'"),
    'Still has placeholder price_enterprise_monthly'
  );
});

check('Upgrade checkout validates price ID before sending to Stripe', () => {
  assert.ok(
    upgradeCheckoutSrc.includes('price_[A-Za-z0-9]{14,}'),
    'Missing price ID validation regex in upgrade checkout'
  );
});

check('Upgrade checkout uses correct env var names (PRO not PROFESSIONAL, TEAM not ENTERPRISE)', () => {
  assert.ok(
    upgradeCheckoutSrc.includes('STRIPE_PRICE_PRO_MONTHLY'),
    'Missing STRIPE_PRICE_PRO_MONTHLY'
  );
  assert.ok(
    upgradeCheckoutSrc.includes('STRIPE_PRICE_TEAM_MONTHLY'),
    'Missing STRIPE_PRICE_TEAM_MONTHLY'
  );
  assert.ok(
    !upgradeCheckoutSrc.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Still uses wrong env var STRIPE_PRICE_PROFESSIONAL_MONTHLY'
  );
  assert.ok(
    !upgradeCheckoutSrc.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
    'Still uses wrong env var STRIPE_PRICE_ENTERPRISE_MONTHLY'
  );
});

check('Upgrade checkout returns 503 with PRICE_NOT_CONFIGURED code when price ID is missing', () => {
  assert.ok(
    upgradeCheckoutSrc.includes('PRICE_NOT_CONFIGURED'),
    'Missing PRICE_NOT_CONFIGURED error code'
  );
});

check('Upgrade checkout logs to checkout_sessions table (not subscription_attempts)', () => {
  assert.ok(
    upgradeCheckoutSrc.includes("'checkout_sessions'"),
    'Should log to checkout_sessions table'
  );
  assert.ok(
    !upgradeCheckoutSrc.includes("'subscription_attempts'"),
    'Should not log to subscription_attempts table'
  );
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
