/**
 * Test: fix-subscriptions-table-never-populated
 * Verifies that the checkout.session.completed webhook handler
 * creates a subscription record in the subscriptions table.
 */

const assert = require('assert');
const fs = require('fs');

const webhookPath = '/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/app/api/webhooks/stripe/route.ts';

function mustContain(content, needle, label) {
  assert(content.includes(needle), `Missing: ${label}\n  Expected to find: ${needle}`);
}

function mustNotContain(content, needle, label) {
  assert(!content.includes(needle), `Unexpected: ${label}\n  Should NOT contain: ${needle}`);
}

function run() {
  const webhook = fs.readFileSync(webhookPath, 'utf8');

  // AC1: handleCheckoutComplete must insert into subscriptions table
  mustContain(webhook, ".from('subscriptions')", 'subscriptions table write in webhook');

  // AC2: subscription insert must include required fields
  mustContain(webhook, 'user_id: userId', 'user_id field in subscriptions insert');
  mustContain(webhook, 'stripe_customer_id:', 'stripe_customer_id field');
  mustContain(webhook, 'stripe_subscription_id:', 'stripe_subscription_id field');
  mustContain(webhook, 'status: subscription.status', 'status field from subscription');
  mustContain(webhook, 'tier: tier', 'tier field');
  mustContain(webhook, 'current_period_start:', 'current_period_start field');
  mustContain(webhook, 'current_period_end:', 'current_period_end field');

  // AC3: upsert used (idempotent — safe to replay webhooks)
  mustContain(webhook, '.upsert(', 'upsert (idempotent insert)');
  mustContain(webhook, "onConflict: 'stripe_subscription_id'", 'conflict key on stripe_subscription_id');

  // AC4: No legacy agent_id writes in webhook insert payloads
  mustNotContain(webhook, 'agent_id: agentId', 'legacy agent_id in insert payloads');

  // AC5: subscription_events and payments still written
  mustContain(webhook, ".from('subscription_events')", 'subscription_events write');
  mustContain(webhook, ".from('payments')", 'payments write');

  console.log('PASS fix-subscriptions-table-never-populated: all acceptance criteria met');
}

try {
  run();
} catch (err) {
  console.error('FAIL fix-subscriptions-table-never-populated');
  console.error(err.message);
  process.exit(1);
}
