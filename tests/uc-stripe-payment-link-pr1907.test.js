'use strict';

/**
 * E2E test for PR #1907 — admin payment link direct (uc-stripe-payment-link-direct)
 * Tests the correctness of all three layers: PaymentLinkService, Express route,
 * and validates the broken paths in payment-links/page.tsx.
 *
 * Run: node tests/uc-stripe-payment-link-pr1907.test.js
 */

const assert = require('assert');

let passed = 0;
let failed = 0;

function ok(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${label}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

async function asyncOk(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${label}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

// ─── Canonical plan tiers from PMF.md ────────────────────────────────────────
const PMF_TIERS = ['starter', 'pro', 'team'];
const PMF_AMOUNTS = { starter: 4900, pro: 14900, team: 39900 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePool(agentRow) {
  return {
    query: jest.fn ? jest.fn() : async (sql, params) => {
      if (sql.includes('WHERE id = $1')) return { rows: agentRow ? [agentRow] : [] };
      if (sql.includes('onboarding_completed = true')) return { rows: agentRow ? [agentRow] : [] };
      return { rows: [] };
    },
  };
}

// Minimal jest-like stub for non-jest context
function jest_fn(impl) {
  const calls = [];
  const fn = async (...args) => {
    calls.push(args);
    return impl ? impl(...args) : undefined;
  };
  fn.mock = { calls };
  return fn;
}

// ─── Test 1: Plan tier names in PaymentLinkService match PMF ─────────────────

console.log('\n[1] PaymentLinkService plan tiers');

ok('PaymentLinkService.js uses canonical tier keys: starter, pro, team (NOT professional/enterprise)', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, '../lib/services/PaymentLinkService.js'), 'utf8');

  // These WRONG names must NOT appear
  assert(!src.includes("'professional'"), "Found 'professional' — should be 'pro'");
  assert(!src.includes("'enterprise'"), "Found 'enterprise' — should be 'team'");
  assert(!src.includes('"professional"'), "Found \"professional\" — should be \"pro\"");
  assert(!src.includes('"enterprise"'), "Found \"enterprise\" — should be \"team\"");

  // Canonical names MUST appear
  assert(src.includes("'pro'") || src.includes('"pro"'), "Missing canonical tier 'pro'");
  assert(src.includes("'team'") || src.includes('"team"'), "Missing canonical tier 'team'");
});

ok('PaymentLinkService.js plan amounts match PMF ($49/$149/$399)', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, '../lib/services/PaymentLinkService.js'), 'utf8');
  assert(src.includes('4900'), 'Missing starter amount 4900');
  assert(src.includes('14900'), 'Missing pro amount 14900');
  assert(src.includes('39900'), 'Missing team amount 39900');
});

// ─── Test 2: Express route uses matching tier keys ────────────────────────────

console.log('\n[2] Express admin/payment-link.js route');

ok('routes/admin/payment-link.js VALID_PLAN_TIERS matches canonical (starter, pro, team)', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, '../routes/admin/payment-link.js'), 'utf8');

  assert(!src.includes("'professional'"), "Found 'professional' — should be 'pro'");
  assert(!src.includes("'enterprise'"), "Found 'enterprise' — should be 'team'");
  assert(src.includes("'pro'"), "Missing 'pro' in VALID_PLAN_TIERS");
  assert(src.includes("'team'"), "Missing 'team' in VALID_PLAN_TIERS");
});

// ─── Test 3: PaymentLinkService functional correctness ───────────────────────

console.log('\n[3] PaymentLinkService functional tests');

const agentRow = { id: 'agent-1', email: 'alice@test.com', first_name: 'Alice', last_name: 'Smith', stripe_customer_id: null, plan_tier: 'pro' };

(async () => {
  await asyncOk('createPaymentLink rejects non-canonical tier', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    delete require.cache[require.resolve('../lib/services/PaymentLinkService')];
    const PLS = require('../lib/services/PaymentLinkService');

    const mockStripe = {
      paymentLinks: { create: async () => ({ id: 'plink_1', url: 'https://buy.stripe.com/test' }) },
    };
    const pool = {
      query: async () => ({ rows: [agentRow] }),
    };

    const svc = new PLS({ pool, stripe: mockStripe });

    // 'professional' and 'enterprise' are wrong — must throw
    try {
      await svc.createPaymentLink('agent-1', 'professional');
      assert.fail('Should have thrown for non-canonical tier "professional"');
    } catch (e) {
      assert(e.message.includes('Invalid plan tier') || e.message.includes('invalid'),
        `Expected "Invalid plan tier" error, got: ${e.message}`);
    }
  });

  await asyncOk('createPaymentLink accepts all canonical tiers', async () => {
    delete require.cache[require.resolve('../lib/services/PaymentLinkService')];
    const PLS = require('../lib/services/PaymentLinkService');

    for (const tier of PMF_TIERS) {
      let createArgs;
      const mockStripe = {
        paymentLinks: {
          create: async (args) => { createArgs = args; return { id: 'plink_1', url: 'https://buy.stripe.com/test' }; },
        },
      };
      const pool = { query: async () => ({ rows: [agentRow] }) };
      const svc = new PLS({ pool, stripe: mockStripe });

      const result = await svc.createPaymentLink('agent-1', tier);
      assert(result.url, `No URL returned for tier ${tier}`);
      assert.strictEqual(createArgs.line_items[0].price_data.unit_amount, PMF_AMOUNTS[tier],
        `Wrong amount for tier ${tier}: expected ${PMF_AMOUNTS[tier]}, got ${createArgs.line_items[0].price_data.unit_amount}`);
    }
  });

  // ─── Test 4: payment-links/page.tsx uses correct Next.js endpoint ─────────────

  console.log('\n[4] payment-links/page.tsx endpoint correctness');

  ok('payment-links/page.tsx does NOT call /api/admin/payment-link-candidates (Express-only endpoint)', () => {
    const fs = require('fs');
    const pagePath = require('path').join(__dirname, '../product/lead-response/dashboard/app/admin/payment-links/page.tsx');
    if (!fs.existsSync(pagePath)) return; // page removed = OK

    const src = fs.readFileSync(pagePath, 'utf8');
    assert(!src.includes('/api/admin/payment-link-candidates'),
      'payment-links/page.tsx calls /api/admin/payment-link-candidates which does NOT exist as a Next.js route (only in Express) — will 404 on Vercel');
  });

  ok('payment-links/page.tsx uses only canonical plan tiers (starter, pro, team)', () => {
    const fs = require('fs');
    const pagePath = require('path').join(__dirname, '../product/lead-response/dashboard/app/admin/payment-links/page.tsx');
    if (!fs.existsSync(pagePath)) return; // page removed = OK

    const src = fs.readFileSync(pagePath, 'utf8');
    assert(!src.includes("'professional'") && !src.includes('"professional"'),
      "payment-links/page.tsx uses 'professional' tier — Next.js /api/admin/create-payment-link only accepts 'pro'");
    assert(!src.includes("'enterprise'") && !src.includes('"enterprise"'),
      "payment-links/page.tsx uses 'enterprise' tier — Next.js /api/admin/create-payment-link only accepts 'team'");
  });

  ok('payment-links/page.tsx does NOT use NEXT_PUBLIC_ADMIN_API_KEY (undefined env, breaks auth)', () => {
    const fs = require('fs');
    const pagePath = require('path').join(__dirname, '../product/lead-response/dashboard/app/admin/payment-links/page.tsx');
    if (!fs.existsSync(pagePath)) return; // page removed = OK

    const src = fs.readFileSync(pagePath, 'utf8');
    assert(!src.includes('NEXT_PUBLIC_ADMIN_API_KEY'),
      'payment-links/page.tsx uses NEXT_PUBLIC_ADMIN_API_KEY which is undefined — Next.js route uses cookie session auth');
  });

  // ─── Test 5: Webhook fallback handles payment link metadata ──────────────────

  console.log('\n[5] Stripe webhook payment-link metadata support');

  ok('webhooks/stripe/route.ts reads metadata.agent_id as fallback for client_reference_id', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../product/lead-response/dashboard/app/api/webhooks/stripe/route.ts'),
      'utf8'
    );
    assert(src.includes('metadata?.agent_id'), 'Webhook does not fall back to metadata.agent_id for payment links');
    assert(src.includes('metadata?.plan_tier'), 'Webhook does not read metadata.plan_tier for payment link tier resolution');
  });

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`${'='.repeat(60)}\n`);

  if (failed > 0) {
    process.exit(1);
  }
})();
