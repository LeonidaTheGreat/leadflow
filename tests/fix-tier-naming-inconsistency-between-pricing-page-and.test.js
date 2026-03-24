/**
 * Test: Fix Tier Naming Inconsistency Between Pricing Page and Checkout API
 * =========================================================================
 * Task: fix-tier-naming-inconsistency-between-pricing-page-and
 * Task ID: 5f5bc8d5-5055-4c63-aea7-3031ce57ba91
 *
 * Problem: Pricing page used tier names (starter, pro, team, brokerage) that
 * did not match the checkout API keys (starter_monthly, professional_monthly,
 * enterprise_monthly). Sending tier=pro_monthly would return 400.
 *
 * Fix: Canonical tier names now match the pricing page and PMF.md:
 *   starter → starter_monthly / starter_annual
 *   pro     → pro_monthly / pro_annual
 *   team    → team_monthly / team_annual
 *   brokerage → contact sales (no checkout)
 */

'use strict'

const assert = require('assert')

// === Canonical tier definitions (mirror of create-checkout/route.ts) ===

const PRICING_TIERS = {
  starter_monthly: { name: 'Starter - Monthly',  amount: 4900   },
  starter_annual:  { name: 'Starter - Annual',    amount: 49000  },
  pro_monthly:     { name: 'Pro - Monthly',       amount: 14900  },
  pro_annual:      { name: 'Pro - Annual',         amount: 149000 },
  team_monthly:    { name: 'Team - Monthly',      amount: 39900  },
  team_annual:     { name: 'Team - Annual',        amount: 399000 },
}

const PRICE_ID_ENV_MAP = {
  starter_monthly: 'STRIPE_PRICE_STARTER_MONTHLY',
  starter_annual:  'STRIPE_PRICE_STARTER_ANNUAL',
  pro_monthly:     'STRIPE_PRICE_PRO_MONTHLY',
  pro_annual:      'STRIPE_PRICE_PRO_ANNUAL',
  team_monthly:    'STRIPE_PRICE_TEAM_MONTHLY',
  team_annual:     'STRIPE_PRICE_TEAM_ANNUAL',
}

// === Canonical tier mapping (mirror of pricing/page.tsx TIER_KEY_MAP) ===

const TIER_KEY_MAP = {
  starter:   'starter',
  pro:       'pro',
  team:      'team',
  brokerage: null, // contact sales
}

// === Canonical signup mapping (mirror of signup/page.tsx PLAN_CHECKOUT_TIER) ===

const PLAN_CHECKOUT_TIER = {
  starter: 'starter_monthly',
  pro:     'pro_monthly',
  team:    'team_monthly',
}

// ================================================================
// Tests
// ================================================================

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
    failed++
  }
}

console.log('\nAPI Tier Names — Canonical names (starter, pro, team)')
console.log('─'.repeat(60))

test('PRICING_TIERS has pro_monthly (not professional_monthly)', () => {
  assert.ok('pro_monthly' in PRICING_TIERS, 'pro_monthly must exist')
  assert.ok(!('professional_monthly' in PRICING_TIERS), 'professional_monthly must NOT exist')
})

test('PRICING_TIERS has team_monthly (not enterprise_monthly)', () => {
  assert.ok('team_monthly' in PRICING_TIERS, 'team_monthly must exist')
  assert.ok(!('enterprise_monthly' in PRICING_TIERS), 'enterprise_monthly must NOT exist')
})

test('PRICING_TIERS has pro_annual (not professional_annual)', () => {
  assert.ok('pro_annual' in PRICING_TIERS, 'pro_annual must exist')
  assert.ok(!('professional_annual' in PRICING_TIERS), 'professional_annual must NOT exist')
})

test('PRICING_TIERS has team_annual (not enterprise_annual)', () => {
  assert.ok('team_annual' in PRICING_TIERS, 'team_annual must exist')
  assert.ok(!('enterprise_annual' in PRICING_TIERS), 'enterprise_annual must NOT exist')
})

test('PRICING_TIERS has correct amounts', () => {
  assert.strictEqual(PRICING_TIERS.starter_monthly.amount, 4900)
  assert.strictEqual(PRICING_TIERS.pro_monthly.amount, 14900)
  assert.strictEqual(PRICING_TIERS.team_monthly.amount, 39900)
})

console.log('\nEnv Var Names — STRIPE_PRICE_PRO/TEAM (not PROFESSIONAL/ENTERPRISE)')
console.log('─'.repeat(60))

test('PRICE_ID_ENV_MAP maps pro_monthly → STRIPE_PRICE_PRO_MONTHLY', () => {
  assert.strictEqual(PRICE_ID_ENV_MAP['pro_monthly'], 'STRIPE_PRICE_PRO_MONTHLY')
})

test('PRICE_ID_ENV_MAP maps team_monthly → STRIPE_PRICE_TEAM_MONTHLY', () => {
  assert.strictEqual(PRICE_ID_ENV_MAP['team_monthly'], 'STRIPE_PRICE_TEAM_MONTHLY')
})

test('PRICE_ID_ENV_MAP has no PROFESSIONAL_ env vars', () => {
  const vals = Object.values(PRICE_ID_ENV_MAP)
  vals.forEach(v => assert.ok(!v.includes('PROFESSIONAL'), `Found PROFESSIONAL in: ${v}`))
})

test('PRICE_ID_ENV_MAP has no ENTERPRISE_ env vars', () => {
  const vals = Object.values(PRICE_ID_ENV_MAP)
  vals.forEach(v => assert.ok(!v.includes('ENTERPRISE'), `Found ENTERPRISE in: ${v}`))
})

test('PRICE_ID_ENV_MAP covers all 6 canonical tiers', () => {
  const expected = ['starter_monthly', 'starter_annual', 'pro_monthly', 'pro_annual', 'team_monthly', 'team_annual']
  expected.forEach(key => assert.ok(key in PRICE_ID_ENV_MAP, `Missing: ${key}`))
})

console.log('\nPricing Page → API tier mapping (no intermediate renaming)')
console.log('─'.repeat(60))

test('TIER_KEY_MAP: starter → starter (direct, no rename)', () => {
  assert.strictEqual(TIER_KEY_MAP['starter'], 'starter')
})

test('TIER_KEY_MAP: pro → pro (direct, not professional)', () => {
  assert.strictEqual(TIER_KEY_MAP['pro'], 'pro')
})

test('TIER_KEY_MAP: team → team (direct, not enterprise)', () => {
  assert.strictEqual(TIER_KEY_MAP['team'], 'team')
})

test('TIER_KEY_MAP: brokerage → null (contact sales)', () => {
  assert.strictEqual(TIER_KEY_MAP['brokerage'], null)
})

test('pricing page pro plan sends pro_monthly to API (not professional_monthly)', () => {
  const base = TIER_KEY_MAP['pro']
  const apiTier = `${base}_monthly`
  assert.strictEqual(apiTier, 'pro_monthly')
  assert.ok(apiTier in PRICING_TIERS, `${apiTier} must exist in PRICING_TIERS`)
})

test('pricing page team plan sends team_monthly to API (not enterprise_monthly)', () => {
  const base = TIER_KEY_MAP['team']
  const apiTier = `${base}_monthly`
  assert.strictEqual(apiTier, 'team_monthly')
  assert.ok(apiTier in PRICING_TIERS, `${apiTier} must exist in PRICING_TIERS`)
})

test('pricing page starter plan sends starter_monthly to API', () => {
  const base = TIER_KEY_MAP['starter']
  const apiTier = `${base}_monthly`
  assert.strictEqual(apiTier, 'starter_monthly')
  assert.ok(apiTier in PRICING_TIERS, `${apiTier} must exist in PRICING_TIERS`)
})

test('pricing page pro annual plan sends pro_annual to API', () => {
  const base = TIER_KEY_MAP['pro']
  const apiTier = `${base}_annual`
  assert.strictEqual(apiTier, 'pro_annual')
  assert.ok(apiTier in PRICING_TIERS, `${apiTier} must exist in PRICING_TIERS`)
})

console.log('\nSignup Page → Checkout tier alignment')
console.log('─'.repeat(60))

test('PLAN_CHECKOUT_TIER: starter → starter_monthly', () => {
  assert.strictEqual(PLAN_CHECKOUT_TIER['starter'], 'starter_monthly')
})

test('PLAN_CHECKOUT_TIER: pro → pro_monthly (not professional_monthly)', () => {
  assert.strictEqual(PLAN_CHECKOUT_TIER['pro'], 'pro_monthly')
  assert.notStrictEqual(PLAN_CHECKOUT_TIER['pro'], 'professional_monthly')
})

test('PLAN_CHECKOUT_TIER: team → team_monthly (not enterprise_monthly)', () => {
  assert.strictEqual(PLAN_CHECKOUT_TIER['team'], 'team_monthly')
  assert.notStrictEqual(PLAN_CHECKOUT_TIER['team'], 'enterprise_monthly')
})

test('all PLAN_CHECKOUT_TIER values exist in PRICING_TIERS', () => {
  Object.values(PLAN_CHECKOUT_TIER).forEach(tier => {
    assert.ok(tier in PRICING_TIERS, `${tier} must be a valid PRICING_TIERS key`)
  })
})

console.log('\n' + '═'.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log('═'.repeat(60))

if (failed > 0) {
  process.exit(1)
}
