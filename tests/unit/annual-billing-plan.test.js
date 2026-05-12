'use strict';

/**
 * Unit tests for Annual Billing Plan feature.
 *
 * Covers:
 *   1. Annual pricing constants (lib/config/index.js)
 *   2. Annual price calculation (10x monthly = 2 months free)
 *   3. BillingService.createCheckoutSession — monthly and annual paths
 *   4. Annual savings calculation in checkout session response
 */

const assert = require('assert');

// ─── Load annual billing constants ────────────────────────────────────────────

const {
  ANNUAL_DISCOUNT_MONTHS,
  ANNUAL_MONTHS_PAID,
  MONTHLY_PRICES,
  ANNUAL_PRICES,
} = require('../../lib/config');

// ─── Mock heavy dependencies before loading BillingService ────────────────────

const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  // Mock stripe
  if (request === 'stripe') {
    return function MockStripe() { return {}; };
  }
  // Mock circuit-breaker
  if (request.includes('circuit-breaker')) {
    return { breakers: { stripe: { execute: (fn) => fn() } } };
  }
  // Mock db module (requires pg which is not installed in worktree)
  if (request.includes('/lib/db') || request === '../db') {
    return { createClient: () => null, query: () => Promise.resolve({ rows: [] }) };
  }
  // Mock pg directly
  if (request === 'pg') {
    return { Pool: class MockPool {} };
  }
  return originalLoad.apply(this, arguments);
};

const { BillingService } = require('../../lib/services/BillingService');

// Restore require
Module._load = originalLoad;

// ─── Test runner helpers ───────────────────────────────────────────────────────

const results = { passed: 0, failed: 0 };

function test(name, fn) {
  try {
    fn();
    results.passed++;
    console.log('  PASS  ' + name);
  } catch (err) {
    results.failed++;
    console.error('  FAIL  ' + name + ': ' + err.message);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    results.passed++;
    console.log('  PASS  ' + name);
  } catch (err) {
    results.failed++;
    console.error('  FAIL  ' + name + ': ' + err.message);
  }
}

// ─── 1. Annual billing constants ──────────────────────────────────────────────

console.log('\nAnnual billing constants');

test('ANNUAL_DISCOUNT_MONTHS is 2', () => {
  assert.strictEqual(ANNUAL_DISCOUNT_MONTHS, 2);
});

test('ANNUAL_MONTHS_PAID is 10', () => {
  assert.strictEqual(ANNUAL_MONTHS_PAID, 10);
});

test('ANNUAL_MONTHS_PAID + ANNUAL_DISCOUNT_MONTHS equals 12', () => {
  assert.strictEqual(ANNUAL_MONTHS_PAID + ANNUAL_DISCOUNT_MONTHS, 12);
});

// ─── 2. Annual price calculation: 10x monthly ─────────────────────────────────

console.log('\nAnnual price calculation (10x monthly = 2 months free)');

test('Starter annual price = $490 (monthly $49 x 10)', () => {
  assert.strictEqual(MONTHLY_PRICES.starter, 49);
  assert.strictEqual(ANNUAL_PRICES.starter, 490);
  assert.strictEqual(ANNUAL_PRICES.starter, MONTHLY_PRICES.starter * ANNUAL_MONTHS_PAID);
});

test('Pro annual price = $1490 (monthly $149 x 10)', () => {
  assert.strictEqual(MONTHLY_PRICES.pro, 149);
  assert.strictEqual(ANNUAL_PRICES.pro, 1490);
  assert.strictEqual(ANNUAL_PRICES.pro, MONTHLY_PRICES.pro * ANNUAL_MONTHS_PAID);
});

test('Team annual price = $3990 (monthly $399 x 10)', () => {
  assert.strictEqual(MONTHLY_PRICES.team, 399);
  assert.strictEqual(ANNUAL_PRICES.team, 3990);
  assert.strictEqual(ANNUAL_PRICES.team, MONTHLY_PRICES.team * ANNUAL_MONTHS_PAID);
});

test('Brokerage annual price = $9990 (monthly $999 x 10)', () => {
  assert.strictEqual(MONTHLY_PRICES.brokerage, 999);
  assert.strictEqual(ANNUAL_PRICES.brokerage, 9990);
  assert.strictEqual(ANNUAL_PRICES.brokerage, MONTHLY_PRICES.brokerage * ANNUAL_MONTHS_PAID);
});

test('Starter annual savings = $98 (2 months free)', () => {
  const savings = MONTHLY_PRICES.starter * ANNUAL_DISCOUNT_MONTHS;
  assert.strictEqual(savings, 98);
});

test('Pro annual savings = $298 (2 months free)', () => {
  const savings = MONTHLY_PRICES.pro * ANNUAL_DISCOUNT_MONTHS;
  assert.strictEqual(savings, 298);
});

test('Team annual savings = $798 (2 months free)', () => {
  const savings = MONTHLY_PRICES.team * ANNUAL_DISCOUNT_MONTHS;
  assert.strictEqual(savings, 798);
});

test('All annual prices are less than 12x monthly (discount verified)', () => {
  const tiers = ['starter', 'pro', 'team', 'brokerage'];
  for (const tier of tiers) {
    const fullYear = MONTHLY_PRICES[tier] * 12;
    const annualPrice = ANNUAL_PRICES[tier];
    assert.ok(annualPrice < fullYear,
      tier + ': annual $' + annualPrice + ' should be < 12x monthly ($' + fullYear + ')');
  }
});

// ─── 3. BillingService.createCheckoutSession — mock Stripe path ───────────────

console.log('\nBillingService.createCheckoutSession (no Stripe = mock path)');

const serviceNoStripe = new BillingService({ stripe: null, db: null });

async function runCheckoutTests() {
  await asyncTest('mock path returns mock session for monthly', async () => {
    const result = await serviceNoStripe.createCheckoutSession({
      agentId: 'agent-uuid-1',
      email: 'agent@example.com',
      tier: 'pro',
      billingInterval: 'monthly',
    });
    assert.ok(result.mock === true, 'Expected mock: true');
    assert.ok(result.sessionId.startsWith('mock_cs_pro_monthly'), 'Expected mock session ID prefix, got: ' + result.sessionId);
    assert.strictEqual(result.billingInterval, 'monthly');
    assert.strictEqual(result.tier, 'pro');
    assert.strictEqual(result.annualSavings, 0, 'Monthly plan should have 0 annual savings');
  });

  await asyncTest('mock path returns annual savings for annual pro', async () => {
    const result = await serviceNoStripe.createCheckoutSession({
      agentId: 'agent-uuid-2',
      email: 'agent2@example.com',
      tier: 'pro',
      billingInterval: 'annual',
    });
    assert.ok(result.mock === true);
    assert.strictEqual(result.billingInterval, 'annual');
    assert.strictEqual(result.annualSavings, 298); // $149 x 2 months
  });

  await asyncTest('mock path starter annual savings = $98', async () => {
    const result = await serviceNoStripe.createCheckoutSession({
      agentId: 'agent-uuid-3',
      email: 'agent3@example.com',
      tier: 'starter',
      billingInterval: 'annual',
    });
    assert.strictEqual(result.annualSavings, 98); // $49 x 2 months
  });

  await asyncTest('mock path team annual savings = $798', async () => {
    const result = await serviceNoStripe.createCheckoutSession({
      agentId: 'agent-uuid-4',
      email: 'agent4@example.com',
      tier: 'team',
      billingInterval: 'annual',
    });
    assert.strictEqual(result.annualSavings, 798); // $399 x 2 months
  });

  await asyncTest('defaults billingInterval to monthly when omitted', async () => {
    const result = await serviceNoStripe.createCheckoutSession({
      agentId: 'agent-uuid-5',
      email: 'agent5@example.com',
      tier: 'starter',
    });
    assert.strictEqual(result.billingInterval, 'monthly');
    assert.strictEqual(result.annualSavings, 0);
  });

  // ─── 4. BillingService.createCheckoutSession — injected Stripe mock ───────────

  console.log('\nBillingService.createCheckoutSession (injected Stripe mock)');

  const configModule = require('../../lib/config');

  // Temporarily inject a price ID for 'pro' annual into config to test the live path
  const originalProYear = configModule.stripe.prices.pro && configModule.stripe.prices.pro.year;
  if (configModule.stripe.prices.pro) {
    configModule.stripe.prices.pro.year = 'price_1TestAnnualProXYZ1234567';
  }

  const serviceWithStripe = new BillingService({
    stripe: {
      checkout: {
        sessions: {
          create: async (params) => ({
            id: 'cs_live_test_001',
            url: 'https://checkout.stripe.com/pay/cs_live_test_001',
            customer_email: params.customer_email,
            metadata: params.metadata,
          }),
        },
      },
    },
    db: null,
  });

  await asyncTest('live path creates checkout session for annual pro', async () => {
    const result = await serviceWithStripe.createCheckoutSession({
      agentId: 'agent-live-1',
      email: 'live@example.com',
      tier: 'pro',
      billingInterval: 'annual',
    });
    assert.strictEqual(result.sessionId, 'cs_live_test_001');
    assert.ok(result.url.includes('cs_live_test_001'));
    assert.strictEqual(result.tier, 'pro');
    assert.strictEqual(result.billingInterval, 'annual');
    assert.strictEqual(result.annualSavings, 298); // $149 x 2
  });

  await asyncTest('live path throws when no price ID configured for tier/interval', async () => {
    // Brokerage has no price configured in test environment
    const serviceWithStripeMissingPrice = new BillingService({
      stripe: {
        checkout: {
          sessions: {
            create: async () => { throw new Error('Should not reach Stripe'); },
          },
        },
      },
      db: null,
    });

    let thrown = false;
    try {
      await serviceWithStripeMissingPrice.createCheckoutSession({
        agentId: 'agent-uuid-6',
        email: 'agent6@example.com',
        tier: 'brokerage',
        billingInterval: 'annual',
      });
    } catch (err) {
      thrown = true;
      assert.ok(
        err.message.includes('No Stripe price configured') || err.message.includes('STRIPE_PRICE'),
        'Error should mention missing price config: ' + err.message
      );
    }
    assert.ok(thrown, 'Should have thrown for missing price ID');
  });

  // Restore config
  if (configModule.stripe.prices.pro) {
    configModule.stripe.prices.pro.year = originalProYear;
  }
}

// ─── Run async tests and report results ───────────────────────────────────────

runCheckoutTests().then(() => {
  console.log('\nResults: ' + results.passed + ' passed, ' + results.failed + ' failed\n');
  if (results.failed > 0) {
    process.exit(1);
  }
}).catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
