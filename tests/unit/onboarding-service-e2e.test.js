'use strict';
/**
 * E2E test for task 9e3b5486 — OnboardingService refactor
 * Verifies: class structure, backward-compat shim, and core business logic.
 * Runnable: node tests/unit/onboarding-service-e2e.test.js
 */

const assert = require('assert');
const path = require('path');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

// ── Minimal chainable mock db ─────────────────────────────────────────────────

function makeDb(tableData = {}) {
  const makeChain = (data, error = null) => {
    const c = {
      from: () => makeChain(data, error),
      select: () => makeChain(data, error),
      insert: () => makeChain(data, error),
      update: () => makeChain(data, error),
      eq: () => makeChain(data, error),
      order: () => makeChain(data, error),
      limit: () => Promise.resolve({ data, error }),
      single: () => Promise.resolve({ data, error }),
      then: (resolve) => resolve({ data, error }),
    };
    return c;
  };

  return {
    from(table) {
      if (table in tableData) {
        const { data, error } = tableData[table];
        return makeChain(data, error);
      }
      return makeChain(null, null);
    },
  };
}

async function run() {
  console.log('\n=== OnboardingService E2E tests (task 9e3b5486) ===\n');

  const OnboardingService = require('../../lib/services/OnboardingService');
  const shim = require('../../lib/onboarding-telemetry');

  // ── 1. Module shape ───────────────────────────────────────────────────────

  await test('OnboardingService is a class (function)', () => {
    assert.strictEqual(typeof OnboardingService, 'function');
    assert.ok(OnboardingService.prototype.logOnboardingEvent);
    assert.ok(OnboardingService.prototype.getFunnelStatus);
    assert.ok(OnboardingService.prototype.getFunnelConversions);
    assert.ok(OnboardingService.prototype.checkAndAlertStuckAgents);
    assert.ok(OnboardingService.prototype.createStuckAlerts);
    assert.ok(OnboardingService.prototype.getOnboardingEvents);
  });

  await test('static STEP_INDEX has 5 entries', () => {
    const keys = Object.keys(OnboardingService.STEP_INDEX);
    assert.strictEqual(keys.length, 5);
    assert.strictEqual(OnboardingService.STEP_INDEX.email_verified, 1);
    assert.strictEqual(OnboardingService.STEP_INDEX.aha_completed, 5);
  });

  await test('static STEP_NAMES matches STEP_INDEX keys', () => {
    const expected = Object.keys(OnboardingService.STEP_INDEX).sort();
    assert.deepStrictEqual([...OnboardingService.STEP_NAMES].sort(), expected);
  });

  // ── 2. Backward-compat shim ──────────────────────────────────────────────

  await test('shim exports all original functions and constants', () => {
    const required = [
      'logOnboardingEvent', 'getFunnelStatus', 'getFunnelConversions',
      'checkAndAlertStuckAgents', 'createStuckAlerts', 'getOnboardingEvents',
      'isSmokTestAccount',
    ];
    for (const fn of required) {
      assert.strictEqual(typeof shim[fn], 'function', `missing shim export: ${fn}`);
    }
    assert.ok(typeof shim.STEP_INDEX === 'object');
    assert.ok(Array.isArray(shim.STEP_NAMES));
    assert.strictEqual(shim.STEP_INDEX.aha_completed, 5);
  });

  await test('shim isSmokTestAccount delegates correctly', () => {
    assert.ok(shim.isSmokTestAccount('smoke-test@foo.com'));
    assert.ok(shim.isSmokTestAccount('agent@leadflow-test.com'));
    assert.strictEqual(shim.isSmokTestAccount('agent@realty.com'), false);
    assert.strictEqual(shim.isSmokTestAccount(null), false);
  });

  await test('shim logOnboardingEvent returns promise (db pass-through)', async () => {
    const db = makeDb({
      onboarding_events: { data: { id: 'e1', step_name: 'email_verified', status: 'started' }, error: null },
      real_estate_agents: { data: { onboarding_step: 0 }, error: null },
    });
    const result = await shim.logOnboardingEvent(db, 'agent-1', 'email_verified', 'started');
    assert.strictEqual(result.success, true);
  });

  // ── 3. Core logic ─────────────────────────────────────────────────────────

  await test('logOnboardingEvent: rejects unknown step name', async () => {
    const svc = new OnboardingService(makeDb());
    const result = await svc.logOnboardingEvent('agent-1', 'invalid_step', 'started');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Invalid step name'));
  });

  await test('logOnboardingEvent: succeeds for valid step + started status', async () => {
    const db = makeDb({
      onboarding_events: { data: { id: 'e2', step_name: 'fub_connected', status: 'started' }, error: null },
    });
    const svc = new OnboardingService(db);
    const result = await svc.logOnboardingEvent('agent-2', 'fub_connected', 'started');
    assert.strictEqual(result.success, true);
  });

  await test('getFunnelStatus: computes is_stuck for agents > 24h at step', async () => {
    const stuckTs = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const db = makeDb({ funnel_real_agents: { data: [{ id: 'a1', onboarding_step: 1, last_onboarding_step_update: stuckTs }], error: null } });
    const svc = new OnboardingService(db);
    const result = await svc.getFunnelStatus();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.agents[0].is_stuck, true);
    assert.ok(result.agents[0].time_at_step_hours >= 25);
  });

  await test('getFunnelStatus: is_stuck is false for recent update', async () => {
    const recentTs = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const db = makeDb({ funnel_real_agents: { data: [{ id: 'a2', onboarding_step: 1, last_onboarding_step_update: recentTs }], error: null } });
    const svc = new OnboardingService(db);
    const result = await svc.getFunnelStatus();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.agents[0].is_stuck, false);
  });

  await test('checkAndAlertStuckAgents: 0 alerts when no stuck agents', async () => {
    const recentTs = new Date().toISOString();
    const db = makeDb({ funnel_real_agents: { data: [{ id: 'a3', onboarding_step: 1, last_onboarding_step_update: recentTs }], error: null } });
    const svc = new OnboardingService(db);
    const result = await svc.checkAndAlertStuckAgents();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.alerts_created, 0);
  });

  await test('createStuckAlerts: empty array → 0 alerts', async () => {
    const svc = new OnboardingService(makeDb());
    const result = await svc.createStuckAlerts([]);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.alerts_created, 0);
  });

  await test('getOnboardingEvents: returns events without agentId filter', async () => {
    const events = [{ id: 'e1', step_name: 'email_verified' }];
    const db = makeDb({ onboarding_events: { data: events, error: null } });
    const svc = new OnboardingService(db);
    const result = await svc.getOnboardingEvents();
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.events, events);
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
