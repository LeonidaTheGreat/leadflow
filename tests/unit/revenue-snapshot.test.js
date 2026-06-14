'use strict';

const assert = require('assert');
const { computeRevenueSnapshot } = require('../../scripts/tasks/revenue-snapshot');

const CONTACTED_STATUSES = ['contacted', 'responded', 'scheduled', 'signed_up'];

function createMockPool() {
  return {
    async query(sql, params) {
      if (sql.includes("FROM subscriptions WHERE status = 'active'") && sql.includes('COUNT(*)')) {
        if (sql.includes('created_at')) return { rows: [{ count: 2 }] };
        return { rows: [{ count: 4 }] };
      }
      if (sql.includes('SUM(') && sql.includes('CASE tier')) return { rows: [{ mrr_cents: 59600 }] };
      if (sql.includes('FROM real_estate_agents') && sql.includes('subscription_status')) return { rows: [{ count: 6 }] };
      if (sql.includes('FROM real_estate_agents') && sql.includes('aha_completed')) return { rows: [{ count: 3 }] };
      if (sql.includes('FROM real_estate_agents')) return { rows: [{ count: 10 }] };
      if (sql.includes('FROM agent_integrations')) return { rows: [{ count: 2 }] };
      if (sql.includes('FROM pilot_recruitment_targets') && sql.includes('status')) return { rows: [{ count: 1 }] };
      if (sql.includes('FROM pilot_recruitment_targets')) return { rows: [{ count: 5 }] };
      return { rows: [{ count: 0 }] };
    },
  };
}

async function run() {
  const pool = createMockPool();
  const snapshot = await computeRevenueSnapshot(pool);

  assert.ok(snapshot.date, 'snapshot must have date');
  assert.strictEqual(snapshot.project_id, 'leadflow');
  assert.ok(typeof snapshot.mrr_cents === 'number', 'mrr_cents must be a number');
  assert.ok(typeof snapshot.conversion_rate === 'number', 'conversion_rate must be a number');

  assert.ok(snapshot.data, 'snapshot must have data field');
  assert.ok(typeof snapshot.data.fub_activation_rate === 'number', 'fub_activation_rate must be present');
  assert.ok(typeof snapshot.data.aha_completion_rate === 'number', 'aha_completion_rate must be present');

  assert.ok(snapshot.data.funnel, 'data.funnel must be present in snapshot output');
  assert.ok(typeof snapshot.data.funnel.signups === 'object', 'funnel.signups must be an object');
  assert.ok(typeof snapshot.data.funnel.fub_connected === 'object', 'funnel.fub_connected must be an object');
  assert.ok(typeof snapshot.data.funnel.aha_moment === 'object', 'funnel.aha_moment must be an object');
  assert.ok(typeof snapshot.data.funnel.paid === 'object', 'funnel.paid must be an object');

  assert.ok(typeof snapshot.data.funnel.signups.count === 'number', 'funnel.signups.count must be a number');
  assert.ok(typeof snapshot.data.funnel.fub_connected.count === 'number', 'funnel.fub_connected.count must be a number');
  assert.ok(typeof snapshot.data.funnel.aha_moment.count === 'number', 'funnel.aha_moment.count must be a number');
  assert.ok(typeof snapshot.data.funnel.paid.count === 'number', 'funnel.paid.count must be a number');
  assert.ok(typeof snapshot.data.funnel.paid.rate === 'number', 'funnel.paid.rate must be a number');

  console.log('revenue-snapshot funnel structure tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
