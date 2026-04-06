/**
 * Integration test: Stripe subscription schema alignment
 * Verifies the database schema can accept the data the webhook handler writes.
 * Tests: subscriptions, subscription_events, payments tables.
 */

const { Client } = require('pg');
const assert = require('assert');

const PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';

async function run() {
  const client = new Client({ connectionString: PG_URL });
  await client.connect();

  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testStripeCustomerId = 'cus_test_schema_alignment';
  const testStripeSubId = 'sub_test_schema_alignment';

  try {
    // --- Test 1: subscriptions accepts all product tiers ---
    for (const tier of ['starter', 'pro', 'team']) {
      const subId = `${testStripeSubId}_${tier}`;
      await client.query(
        `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, tier, price_id, interval)
         VALUES ($1, $2, $3, 'active', $4, 'price_test123456789012', 'month')
         ON CONFLICT (stripe_subscription_id) DO UPDATE SET tier = $4`,
        [testUserId, testStripeCustomerId, subId, tier]
      );
    }
    console.log('  PASS: subscriptions table accepts starter/pro/team tiers');

    // --- Test 2: subscription_events accepts webhook payload shape ---
    await client.query(
      `INSERT INTO subscription_events (user_id, event_type, plan_tier, mrr, stripe_event_data)
       VALUES ($1, 'subscription_created', 'pro', 14900, $2::jsonb)`,
      [testUserId, JSON.stringify({ subscription_id: testStripeSubId, tier: 'pro', mrr: 149 })]
    );
    console.log('  PASS: subscription_events accepts plan_tier + stripe_event_data');

    // --- Test 3: subscription_events accepts payment_failed shape ---
    await client.query(
      `INSERT INTO subscription_events (user_id, event_type, attempt_count, stripe_event_data)
       VALUES ($1, 'payment_failed', 1, $2::jsonb)`,
      [testUserId, JSON.stringify({ invoice_id: 'in_test', attempt_count: 1 })]
    );
    console.log('  PASS: subscription_events accepts payment_failed with attempt_count');

    // --- Test 4: subscription_events accepts cancellation shape ---
    await client.query(
      `INSERT INTO subscription_events (user_id, event_type, mrr_change, stripe_event_data)
       VALUES ($1, 'subscription_cancelled', -14900, $2::jsonb)`,
      [testUserId, JSON.stringify({ subscription_id: testStripeSubId, mrr_lost: 149, reason: 'cancellation_requested' })]
    );
    console.log('  PASS: subscription_events accepts cancellation with mrr_change');

    // --- Test 5: payments accepts 'succeeded' status ---
    await client.query(
      `INSERT INTO payments (user_id, stripe_invoice_id, amount, status, period_start, period_end)
       VALUES ($1, 'in_test_schema_alignment', 149.00, 'succeeded', NOW(), NOW() + interval '1 month')`,
      [testUserId]
    );
    console.log('  PASS: payments table accepts succeeded status');

    // --- Test 6: payments rejects 'paid' status ---
    let paidRejected = false;
    try {
      await client.query(
        `INSERT INTO payments (user_id, stripe_invoice_id, amount, status)
         VALUES ($1, 'in_test_paid_status', 149.00, 'paid')`,
        [testUserId]
      );
    } catch (e) {
      if (e.message.includes('payments_status_check')) paidRejected = true;
    }
    assert(paidRejected, 'payments table should reject status=paid');
    console.log('  PASS: payments table correctly rejects paid status');

    console.log('\nPASS stripe-subscription-schema-alignment: all 6 checks passed');
  } finally {
    // Cleanup test data
    await client.query(`DELETE FROM subscription_events WHERE user_id = $1`, [testUserId]);
    await client.query(`DELETE FROM payments WHERE user_id = $1`, [testUserId]);
    await client.query(`DELETE FROM subscriptions WHERE user_id = $1`, [testUserId]);
    await client.end();
  }
}

run().catch(err => {
  console.error('FAIL stripe-subscription-schema-alignment');
  console.error(err.message);
  process.exit(1);
});
