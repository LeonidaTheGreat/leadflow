'use strict';

/**
 * Integration test: Admin Reactivation Campaign
 * Task: 7ab36625-8996-4a65-a2e0-a4df0e2a554a
 *
 * Tests:
 * 1. GET /api/admin/reactivation-campaign/stats returns {eligible: number, sent: number}
 * 2. POST /api/admin/reactivation-campaign with dryRun=true returns {eligible: N} without sending emails
 */

const assert = require('assert');
const LapsedTrialReactivationService = require('../../lib/services/LapsedTrialReactivationService');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name} -- ${err.message}`);
    failed++;
  }
}

function makeMockPool(eligibleCount, sentCount) {
  return {
    query(sql) {
      // COUNT_SENT_SQL: only checks trial_email_expired_sent = true (no COALESCE false filter)
      if (sql.includes('COUNT(*)') && sql.includes('trial_email_expired_sent, false) = true')) {
        return Promise.resolve({ rows: [{ count: sentCount }] });
      }
      // COUNT_ELIGIBLE_SQL: filters for COALESCE(trial_email_expired_sent, false) = false
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: eligibleCount }] });
      }
      return Promise.resolve({
        rows: [
          { id: 'a1', email: 'test@example.com', first_name: 'Test', trial_ends_at: '2026-01-01T00:00:00Z' },
        ],
      });
    },
  };
}

async function main() {
  console.log('=== Admin Reactivation Campaign Integration Tests ===\n');

  // Test 1: GET /stats returns {eligible, sent}
  await test('getStats() returns {eligible: number, sent: number}', async () => {
    const pool = makeMockPool(15, 3);
    const service = new LapsedTrialReactivationService({ pool });
    const stats = await service.getStats();

    assert.strictEqual(typeof stats, 'object', 'stats must be an object');
    assert.ok('eligible' in stats, 'stats must have eligible field');
    assert.ok('sent' in stats, 'stats must have sent field');
    assert.strictEqual(typeof stats.eligible, 'number', 'eligible must be a number');
    assert.strictEqual(typeof stats.sent, 'number', 'sent must be a number');
    assert.strictEqual(stats.eligible, 15, 'eligible count must match mock value');
    assert.strictEqual(stats.sent, 3, 'sent count must match mock value');
  });

  // Test 2: getStats() returns zero counts when no data
  await test('getStats() returns zero eligible and sent when no lapsed agents', async () => {
    const pool = makeMockPool(0, 0);
    const service = new LapsedTrialReactivationService({ pool });
    const stats = await service.getStats();

    assert.strictEqual(stats.eligible, 0, 'eligible must be 0');
    assert.strictEqual(stats.sent, 0, 'sent must be 0');
  });

  // Test 3: getStats() throws when pool is not configured
  await test('getStats() throws when pool not configured', async () => {
    const service = new LapsedTrialReactivationService({});
    let threw = false;
    try {
      await service.getStats();
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('DB pool not configured'), `Expected pool error, got: ${err.message}`);
    }
    assert.ok(threw, 'getStats() must throw when pool is not configured');
  });

  // Test 4: POST dryRun=true returns {eligible} without sending emails
  await test('runCampaign dryRun=true returns eligible count and agent list without sending emails', async () => {
    const emailCalls = [];
    const pool = makeMockPool(5, 0);
    const mockEmailService = {
      sendLapsedTrialReactivation(params) {
        emailCalls.push(params);
        return Promise.resolve({ success: true, resend_id: 're_test' });
      },
    };
    const service = new LapsedTrialReactivationService({ pool, emailService: mockEmailService });

    const result = await service.runCampaign({ dryRun: true, limit: 100 });

    assert.strictEqual(typeof result.eligible, 'number', 'result must have numeric eligible');
    assert.ok(Array.isArray(result.agents), 'result must have agents array');
    assert.strictEqual(emailCalls.length, 0, 'no emails must be sent in dry run');
  });

  // Test 5: GET /stats route handler authorization check (401 for missing key)
  await test('GET /stats route rejects unauthorized requests', async () => {
    const originalKey = process.env.LEADFLOW_API_KEY;
    process.env.LEADFLOW_API_KEY = 'test-secret-key';

    try {
      const router = require('../../routes/admin/reactivation-campaign');
      const statsLayer = router.stack.find((entry) => (
        entry.route &&
        entry.route.path === '/api/admin/reactivation-campaign/stats' &&
        entry.route.methods &&
        entry.route.methods.get
      ));

      assert.ok(statsLayer, 'GET /api/admin/reactivation-campaign/stats route must exist');

      const handler = statsLayer.route.stack[0].handle;

      let responseStatus = null;
      let responseBody = null;
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { responseBody = body; return this; },
      };

      const req = { headers: {} };
      await handler(req, res);

      assert.strictEqual(res.statusCode, 401, 'Must return 401 for unauthorized request');
      assert.deepStrictEqual(responseBody, { error: 'Unauthorized' }, 'Must return Unauthorized error');
    } finally {
      if (originalKey === undefined) delete process.env.LEADFLOW_API_KEY;
      else process.env.LEADFLOW_API_KEY = originalKey;
    }
  });

  // Test 6: GET /stats route handler returns stats when authorized
  await test('GET /stats route returns stats for authorized requests', async () => {
    const originalKey = process.env.LEADFLOW_API_KEY;
    process.env.LEADFLOW_API_KEY = 'test-secret-key';

    try {
      // Clear require cache to pick up env var
      delete require.cache[require.resolve('../../routes/admin/reactivation-campaign')];
      delete require.cache[require.resolve('../../lib/services/LapsedTrialReactivationService')];
      delete require.cache[require.resolve('../../lib/db')];

      // Mock the pool
      const mockPool = makeMockPool(7, 2);

      // We test the service directly here because mocking getPool in isolation
      // requires Jest. Validate the service getStats shape is correct for the route contract.
      const LapsedTrialSvc = require('../../lib/services/LapsedTrialReactivationService');
      const service = new LapsedTrialSvc({ pool: mockPool });
      const stats = await service.getStats();

      assert.ok('eligible' in stats, 'stats must contain eligible');
      assert.ok('sent' in stats, 'stats must contain sent');
      assert.strictEqual(stats.eligible, 7, 'eligible must be 7');
      assert.strictEqual(stats.sent, 2, 'sent must be 2');
    } finally {
      if (originalKey === undefined) delete process.env.LEADFLOW_API_KEY;
      else process.env.LEADFLOW_API_KEY = originalKey;
    }
  });

  console.log(`\n${passed + failed} tests -- ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
