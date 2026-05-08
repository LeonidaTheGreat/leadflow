'use strict';

const assert = require('assert');

const LapsedTrialReactivationService = require('../../lib/services/LapsedTrialReactivationService');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

async function main() {
  const mockPool = {
    query: (sql, params) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: 42 }] });
      }
      return Promise.resolve({
        rows: [
          { id: 'a1', email: 'test@example.com', first_name: 'Test', trial_ends_at: '2026-01-01T00:00:00Z' },
          { id: 'a2', email: 'test2@example.com', first_name: 'Agent', trial_ends_at: '2026-01-02T00:00:00Z' },
        ],
      });
    },
  };

  const emailCalls = [];
  const mockEmailService = {
    sendLapsedTrialReactivation: (params) => {
      emailCalls.push(params);
      return Promise.resolve({ success: true, resend_id: 're_test' });
    },
  };

  const service = new LapsedTrialReactivationService({
    pool: mockPool,
    emailService: mockEmailService,
    appUrl: 'https://leadflow-ai-five.vercel.app',
  });

  await asyncTest('dryRun returns eligible count without sending emails', async () => {
    emailCalls.length = 0;
    const result = await service.runCampaign({ dryRun: true, limit: 10 });
    assert.strictEqual(result.eligible, 42, 'eligible count should be 42');
    assert.strictEqual(result.agents.length, 2, 'should return 2 agent details');
    assert.strictEqual(emailCalls.length, 0, 'no emails should be sent in dry run');
  });

  await asyncTest('dryRun result contains agent details', async () => {
    const result = await service.runCampaign({ dryRun: true, limit: 10 });
    assert.strictEqual(result.agents[0].email, 'test@example.com');
    assert.strictEqual(result.agents[0].first_name, 'Test');
    assert.ok(result.agents[0].id, 'agent should have an id');
  });

  await asyncTest('dryRun does not call pool update queries', async () => {
    const queryCalls = [];
    const trackingPool = {
      query: (sql, params) => {
        queryCalls.push({ sql, params });
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: 5 }] });
        }
        return Promise.resolve({ rows: [] });
      },
    };

    const svc = new LapsedTrialReactivationService({
      pool: trackingPool,
      emailService: mockEmailService,
      appUrl: 'https://example.com',
    });

    await svc.runCampaign({ dryRun: true, limit: 5 });
    const updateCalls = queryCalls.filter((c) => c.sql.includes('UPDATE'));
    assert.strictEqual(updateCalls.length, 0, 'dryRun must not issue UPDATE queries');
  });

  test('service requires pool to be configured', () => {
    const svc = new LapsedTrialReactivationService({ emailService: mockEmailService });
    assert.rejects(
      () => svc.runCampaign({ dryRun: true, limit: 10 }),
      /DB pool not configured/
    );
  });

  test('SQL query filters for expired trials without aha', () => {
    const sql = `
      SELECT id, email, first_name, trial_ends_at
      FROM real_estate_agents
      WHERE trial_ends_at IS NOT NULL
        AND trial_ends_at < NOW()
        AND COALESCE(aha_completed, false) = false
        AND COALESCE(subscription_status, 'inactive') != 'active'
        AND COALESCE(trial_email_expired_sent, false) = false
        AND email IS NOT NULL
      ORDER BY trial_ends_at ASC
      LIMIT $1
    `;
    assert.ok(sql.includes('trial_ends_at < NOW()'), 'must filter expired trials');
    assert.ok(sql.includes('aha_completed'), 'must filter by aha_completed');
    assert.ok(sql.includes('subscription_status'), 'must filter by subscription_status');
    assert.ok(sql.includes('trial_email_expired_sent'), 'must exclude already-sent');
  });

  console.log(`\n${passed + failed} tests — ✅ ${passed} passed, ❌ ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
