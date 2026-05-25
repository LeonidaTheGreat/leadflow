'use strict';

const assert = require('assert');
const RevenueMetricsService = require('../../lib/services/RevenueMetricsService');

const TEST_SUB_EXCLUSION = "stripe_subscription_id NOT LIKE 'sub_test_%'";

function createMockPool() {
  const subscriptionSqlsSeen = [];
  const pool = {
    subscriptionSqlsSeen,
    async query(sql) {
      if (sql.includes('FROM subscriptions')) subscriptionSqlsSeen.push(sql);
      if (sql.includes('activated_at')) return { rows: [{ count: 2 }] };
      if (sql.includes("FROM subscriptions WHERE status = 'active'") && sql.includes('COUNT')) return { rows: [{ count: 4 }] };
      if (sql.includes('FROM real_estate_agents WHERE subscription_status')) return { rows: [{ count: 6 }] };
      if (sql.includes('SUM(CASE plan_tier')) return { rows: [{ coalesce: 59600 }] };
      if (sql.includes('FROM real_estate_agents') && sql.includes('WHERE aha_completed = true')) return { rows: [{ count: 3 }] };
      if (sql.includes('FROM real_estate_agents') && !sql.includes('WHERE')) return { rows: [{ count: 10 }] };
      if (sql.includes('FROM agent_integrations')) return { rows: [{ count: 2 }] };
      if (sql.includes('FROM pilot_recruitment_targets WHERE contacted = true')) return { rows: [{ count: 1 }] };
      if (sql.includes('FROM pilot_recruitment_targets')) return { rows: [{ count: 5 }] };
      return { rows: [{ count: 0 }] };
    },
  };
  return pool;
}

async function run() {
  const pool = createMockPool();
  const service = new RevenueMetricsService(pool, { botToken: '', chatId: '' });
  const snapshot = await service.computeSnapshot(new Date('2026-05-10T12:00:00Z'));

  // Verify all subscription queries exclude test IDs to prevent phantom MRR
  for (const sql of pool.subscriptionSqlsSeen) {
    assert.ok(
      sql.includes(TEST_SUB_EXCLUSION),
      `Subscription query missing test-ID exclusion filter: ${sql.slice(0, 120)}`
    );
  }
  assert.ok(pool.subscriptionSqlsSeen.length > 0, 'Expected at least one subscription query');

  assert.strictEqual(snapshot.active_subscribers, 4);
  assert.strictEqual(snapshot.trial_users, 6);
  assert.strictEqual(snapshot.new_subscribers, 2);
  assert.strictEqual(snapshot.mrr_cents, 59600);
  assert.strictEqual(snapshot.conversion_rate, 0.4);
  assert.strictEqual(snapshot.data.fub_activation_rate, 0.2);
  assert.strictEqual(snapshot.data.aha_completion_rate, 0.3);
  assert.strictEqual(snapshot.data.pilot_contacted_rate, 0.2);

  const alert = await service.maybeSendThresholdAlert(snapshot);
  assert.strictEqual(alert.alerted, false);

  const badSnapshot = JSON.parse(JSON.stringify(snapshot));
  badSnapshot.data.fub_activation_rate = 0.1;
  badSnapshot.data.aha_completion_rate = 0.1;

  let sendCount = 0;
  const serviceWithAlert = new RevenueMetricsService(createMockPool(), {
    botToken: 'token',
    chatId: '123',
    telegramRequest: (options, cb) => {
      const res = { statusCode: 200, on(event, handler) { if (event === 'data') handler(''); if (event === 'end') handler(); } };
      cb(res);
      return { on() {}, setTimeout() {}, write() { sendCount += 1; }, end() {} };
    },
  });

  const breach = await serviceWithAlert.maybeSendThresholdAlert(badSnapshot);
  assert.strictEqual(breach.alerted, true);
  assert.ok(Array.isArray(breach.breaches));
  assert.strictEqual(sendCount, 1);

  console.log('revenue-metrics-service tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
