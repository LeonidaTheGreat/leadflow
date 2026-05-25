'use strict';

const assert = require('assert');
const RevenueMetricsService = require('../../lib/services/RevenueMetricsService');

function createMockPool() {
  return {
    async query(sql) {
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
}

async function run() {
  const service = new RevenueMetricsService(createMockPool(), { botToken: '', chatId: '' });
  const snapshot = await service.computeSnapshot(new Date('2026-05-10T12:00:00Z'));

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

  // Test: computeSnapshot SQL queries must exclude test subscription IDs (sub_test_*)
  // This prevents phantom MRR from integration test data polluting revenue metrics.
  const capturedQueries = [];
  const trackingPool = {
    async query(sql, params) {
      capturedQueries.push(sql);
      if (sql.includes('activated_at')) return { rows: [{ count: 0 }] };
      if (sql.includes("FROM subscriptions WHERE status = 'active'") && sql.includes('COUNT')) return { rows: [{ count: 0 }] };
      if (sql.includes('FROM real_estate_agents WHERE subscription_status')) return { rows: [{ count: 0 }] };
      if (sql.includes('SUM(CASE plan_tier')) return { rows: [{ coalesce: 0 }] };
      if (sql.includes('FROM real_estate_agents') && sql.includes('WHERE aha_completed = true')) return { rows: [{ count: 0 }] };
      if (sql.includes('FROM real_estate_agents') && !sql.includes('WHERE')) return { rows: [{ count: 0 }] };
      if (sql.includes('FROM agent_integrations')) return { rows: [{ count: 0 }] };
      if (sql.includes('FROM pilot_recruitment_targets WHERE contacted = true')) return { rows: [{ count: 0 }] };
      if (sql.includes('FROM pilot_recruitment_targets')) return { rows: [{ count: 0 }] };
      return { rows: [{ count: 0 }] };
    },
  };
  const trackingService = new RevenueMetricsService(trackingPool);
  await trackingService.computeSnapshot(new Date('2026-05-10T12:00:00Z'));

  // All queries touching subscriptions must exclude test subscription IDs
  const subscriptionQueries = capturedQueries.filter(q => q.includes('FROM subscriptions'));
  assert.ok(subscriptionQueries.length > 0, 'Expected at least one query against subscriptions table');
  for (const q of subscriptionQueries) {
    assert.ok(
      q.includes("sub_test_%"),
      `Expected test subscription guard in query: ${q}`
    );
  }
  console.log('revenue-metrics-service test-subscription guard tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
