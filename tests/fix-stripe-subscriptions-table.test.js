const assert = require('assert');
const fs = require('fs');

const migrationPath = '/Users/clawdbot/projects/leadflow/supabase/migrations/003_stripe_subscriptions.sql';
const webhookPath = '/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/app/api/webhooks/stripe/route.ts';

function mustContain(content, needle, label) {
  assert(content.includes(needle), `Missing: ${label} (${needle})`);
}

function mustNotContain(content, needle, label) {
  assert(!content.includes(needle), `Unexpected: ${label} (${needle})`);
}

function run() {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  const webhook = fs.readFileSync(webhookPath, 'utf8');

  // AC: required Stripe persistence tables exist
  mustContain(migration, 'CREATE TABLE IF NOT EXISTS subscriptions', 'subscriptions table');
  mustContain(migration, 'CREATE TABLE IF NOT EXISTS subscription_events', 'subscription_events table');
  mustContain(migration, 'CREATE TABLE IF NOT EXISTS payments', 'payments table');
  mustContain(migration, 'CREATE TABLE IF NOT EXISTS checkout_sessions', 'checkout_sessions table');
  mustContain(migration, 'CREATE TABLE IF NOT EXISTS mrr_snapshots', 'mrr_snapshots table');

  // AC: webhook uses user_id-based writes (not agent_id mismatch)
  mustContain(webhook, 'user_id: userId', 'user_id writes');
  mustNotContain(webhook, 'agent_id: agentId', 'legacy agent_id write in webhook payloads');

  // AC: webhook persists records into new tables
  mustContain(webhook, ".from('subscriptions')", 'subscriptions writes');
  mustContain(webhook, ".from('subscription_events')", 'subscription_events writes');
  mustContain(webhook, ".from('payments')", 'payments writes');

  console.log('PASS fix-stripe-subscriptions-table e2e checks');
}

try {
  run();
} catch (err) {
  console.error('FAIL fix-stripe-subscriptions-table e2e checks');
  console.error(err.message);
  process.exit(1);
}
