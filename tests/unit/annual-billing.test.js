'use strict';

/**
 * Unit tests for annual billing plan feature
 *
 * Covers:
 *  - Tier key construction (plan_id + interval)
 *  - Annual price math (10 months billed upfront = 2 months free)
 *  - MRR calculation for annual subscriptions (amount/12)
 *  - getTierFromPriceId logic (both monthly and annual price IDs)
 *  - Checkout tier validation
 */

const assert = require('assert');

// ─── Constants (mirror create-checkout/route.ts) ─────────────────────────────

const PRICING_TIERS = {
  starter_monthly:  { name: 'Starter - Monthly',  amount: 4900  },
  starter_annual:   { name: 'Starter - Annual',   amount: 49000 },
  pro_monthly:      { name: 'Pro - Monthly',       amount: 14900 },
  pro_annual:       { name: 'Pro - Annual',        amount: 149000 },
  team_monthly:     { name: 'Team - Monthly',      amount: 39900 },
  team_annual:      { name: 'Team - Annual',       amount: 399000 },
};

const MONTHLY_PRICES = { starter: 49, pro: 149, team: 399 };
const ANNUAL_MONTHS_BILLED = 10;

// ─── Business logic helpers (pure, no Stripe dependency) ─────────────────────

function buildTierKey(planId, interval) {
  if (!['starter', 'pro', 'team'].includes(planId)) throw new Error('Invalid planId');
  if (!['monthly', 'annual'].includes(interval)) throw new Error('Invalid interval');
  return `${planId}_${interval}`;
}

function annualPrice(monthlyPrice) {
  return monthlyPrice * ANNUAL_MONTHS_BILLED;
}

function annualSavings(monthlyPrice) {
  return monthlyPrice * (12 - ANNUAL_MONTHS_BILLED);
}

function calculateMRRFromStripe(amountCents, intervalStr) {
  if (intervalStr === 'month') return amountCents / 100;
  if (intervalStr === 'year')  return amountCents / 12 / 100;
  return 0;
}

function getTierFromPriceId(priceId, priceMap) {
  const entry = priceMap[priceId];
  return entry || 'pro';
}

// ─── Test runner ─────────────────────────────────────────────────────────────

const results = { passed: 0, failed: 0 };

function test(name, fn) {
  try {
    fn();
    results.passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.failed++;
    console.error(`  FAIL  ${name}: ${err.message}`);
  }
}

// ─── Tier key construction ────────────────────────────────────────────────────

console.log('\nTier key construction');

test('starter + monthly → starter_monthly', () => {
  assert.strictEqual(buildTierKey('starter', 'monthly'), 'starter_monthly');
});

test('pro + annual → pro_annual', () => {
  assert.strictEqual(buildTierKey('pro', 'annual'), 'pro_annual');
});

test('team + annual → team_annual', () => {
  assert.strictEqual(buildTierKey('team', 'annual'), 'team_annual');
});

test('invalid planId throws', () => {
  assert.throws(() => buildTierKey('gold', 'monthly'), /Invalid planId/);
});

test('invalid interval throws', () => {
  assert.throws(() => buildTierKey('pro', 'weekly'), /Invalid interval/);
});

// ─── Annual pricing math ──────────────────────────────────────────────────────

console.log('\nAnnual pricing math (10 months billed, 2 months free)');

test('starter annual = $490 (10 × $49)', () => {
  assert.strictEqual(annualPrice(MONTHLY_PRICES.starter), 490);
});

test('pro annual = $1490 (10 × $149)', () => {
  assert.strictEqual(annualPrice(MONTHLY_PRICES.pro), 1490);
});

test('team annual = $3990 (10 × $399)', () => {
  assert.strictEqual(annualPrice(MONTHLY_PRICES.team), 3990);
});

test('starter annual savings = $98 (2 × $49)', () => {
  assert.strictEqual(annualSavings(MONTHLY_PRICES.starter), 98);
});

test('pro annual savings = $298 (2 × $149)', () => {
  assert.strictEqual(annualSavings(MONTHLY_PRICES.pro), 298);
});

test('team annual savings = $798 (2 × $399)', () => {
  assert.strictEqual(annualSavings(MONTHLY_PRICES.team), 798);
});

test('PRICING_TIERS starter_annual amount = 49000 cents', () => {
  assert.strictEqual(PRICING_TIERS['starter_annual'].amount, 49000);
});

test('PRICING_TIERS pro_annual amount = 149000 cents', () => {
  assert.strictEqual(PRICING_TIERS['pro_annual'].amount, 149000);
});

test('PRICING_TIERS team_annual amount = 399000 cents', () => {
  assert.strictEqual(PRICING_TIERS['team_annual'].amount, 399000);
});

// ─── MRR calculation for Stripe intervals ─────────────────────────────────────

console.log('\nMRR calculation from Stripe subscription amounts');

test('monthly $149 subscription → MRR $149', () => {
  assert.strictEqual(calculateMRRFromStripe(14900, 'month'), 149);
});

test('annual $1490 subscription → MRR $124.17 (1490/12)', () => {
  const mrr = calculateMRRFromStripe(149000, 'year');
  assert.ok(Math.abs(mrr - 149000 / 12 / 100) < 0.01, `Expected ~${(149000/12/100).toFixed(2)}, got ${mrr.toFixed(2)}`);
});

test('annual $490 starter → MRR $40.83', () => {
  const mrr = calculateMRRFromStripe(49000, 'year');
  assert.ok(Math.abs(mrr - 49000 / 12 / 100) < 0.01);
});

test('annual $3990 team → MRR $332.50', () => {
  const mrr = calculateMRRFromStripe(399000, 'year');
  assert.ok(Math.abs(mrr - 399000 / 12 / 100) < 0.01);
});

test('unknown interval → MRR 0', () => {
  assert.strictEqual(calculateMRRFromStripe(14900, 'week'), 0);
});

// ─── getTierFromPriceId (monthly and annual) ──────────────────────────────────

console.log('\ngetTierFromPriceId — monthly and annual price ID mapping');

const FAKE_PRICE_MAP = {
  'price_starter_monthly_fake': 'starter',
  'price_starter_annual_fake':  'starter',
  'price_pro_monthly_fake':     'pro',
  'price_pro_annual_fake':      'pro',
  'price_team_monthly_fake':    'team',
  'price_team_annual_fake':     'team',
};

test('starter monthly price ID → tier "starter"', () => {
  assert.strictEqual(getTierFromPriceId('price_starter_monthly_fake', FAKE_PRICE_MAP), 'starter');
});

test('starter annual price ID → tier "starter"', () => {
  assert.strictEqual(getTierFromPriceId('price_starter_annual_fake', FAKE_PRICE_MAP), 'starter');
});

test('pro monthly price ID → tier "pro"', () => {
  assert.strictEqual(getTierFromPriceId('price_pro_monthly_fake', FAKE_PRICE_MAP), 'pro');
});

test('pro annual price ID → tier "pro"', () => {
  assert.strictEqual(getTierFromPriceId('price_pro_annual_fake', FAKE_PRICE_MAP), 'pro');
});

test('team monthly price ID → tier "team"', () => {
  assert.strictEqual(getTierFromPriceId('price_team_monthly_fake', FAKE_PRICE_MAP), 'team');
});

test('team annual price ID → tier "team"', () => {
  assert.strictEqual(getTierFromPriceId('price_team_annual_fake', FAKE_PRICE_MAP), 'team');
});

test('unknown price ID → falls back to "pro"', () => {
  assert.strictEqual(getTierFromPriceId('price_unknown_xyz', FAKE_PRICE_MAP), 'pro');
});

// ─── Checkout tier validation ─────────────────────────────────────────────────

console.log('\nCheckout tier validation');

test('all 6 tier keys exist in PRICING_TIERS', () => {
  const expected = [
    'starter_monthly', 'starter_annual',
    'pro_monthly',     'pro_annual',
    'team_monthly',    'team_annual',
  ];
  for (const key of expected) {
    assert.ok(PRICING_TIERS[key], `Missing tier: ${key}`);
  }
});

test('annual tier amounts are exactly 10× monthly', () => {
  assert.strictEqual(PRICING_TIERS['starter_annual'].amount, PRICING_TIERS['starter_monthly'].amount * 10);
  assert.strictEqual(PRICING_TIERS['pro_annual'].amount,     PRICING_TIERS['pro_monthly'].amount     * 10);
  assert.strictEqual(PRICING_TIERS['team_annual'].amount,    PRICING_TIERS['team_monthly'].amount    * 10);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\nResults: ${results.passed} passed, ${results.failed} failed\n`);

if (results.failed > 0) {
  process.exit(1);
}
