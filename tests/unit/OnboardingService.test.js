'use strict';

/**
 * Unit tests for lib/services/OnboardingService
 */

const assert = require('assert');
const OnboardingService = require('../../lib/services/OnboardingService');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMockDb(overrides = {}) {
  const chain = (data, error = null) => ({
    select: () => chain(data, error),
    insert: () => chain(data, error),
    update: () => chain(data, error),
    upsert: () => chain(data, error),
    single: () => Promise.resolve({ data, error }),
    eq: () => chain(data, error),
    order: () => chain(data, error),
    limit: () => Promise.resolve({ data, error }),
    from: () => chain(data, error),
    then: (resolve) => resolve({ data, error }),
  });

  return {
    from: (table) => {
      if (overrides[table]) return overrides[table];
      return chain(null, null);
    },
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result
        .then(() => {
          console.log(`  ✓ ${name}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ✗ ${name}: ${err.message}`);
          failed++;
        });
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
  return Promise.resolve();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== OnboardingService unit tests ===\n');

  // Class shape
  await test('exports a class', () => {
    assert.strictEqual(typeof OnboardingService, 'function');
  });

  await test('has STEP_INDEX static property', () => {
    assert.strictEqual(typeof OnboardingService.STEP_INDEX, 'object');
    assert.strictEqual(OnboardingService.STEP_INDEX.email_verified, 1);
    assert.strictEqual(OnboardingService.STEP_INDEX.aha_completed, 5);
  });

  await test('has STEP_NAMES static property', () => {
    assert.ok(Array.isArray(OnboardingService.STEP_NAMES));
    assert.ok(OnboardingService.STEP_NAMES.includes('fub_connected'));
  });

  // isSmokTestAccount
  await test('isSmokTestAccount: detects smoke-test@ prefix', () => {
    assert.ok(OnboardingService.isSmokTestAccount('smoke-test@example.com'));
  });

  await test('isSmokTestAccount: detects @leadflow-test.com suffix', () => {
    assert.ok(OnboardingService.isSmokTestAccount('anyone@leadflow-test.com'));
  });

  await test('isSmokTestAccount: returns false for normal email', () => {
    assert.strictEqual(OnboardingService.isSmokTestAccount('agent@realty.com'), false);
  });

  await test('isSmokTestAccount: returns false for null/undefined', () => {
    assert.strictEqual(OnboardingService.isSmokTestAccount(null), false);
    assert.strictEqual(OnboardingService.isSmokTestAccount(undefined), false);
  });

  // logOnboardingEvent — invalid step
  await test('logOnboardingEvent: rejects invalid step name', async () => {
    const db = makeMockDb();
    const svc = new OnboardingService(db);
    const result = await svc.logOnboardingEvent('agent-1', 'bad_step', 'completed');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Invalid step name'));
  });

  // logOnboardingEvent — event insert error
  await test('logOnboardingEvent: returns failure on db insert error', async () => {
    const errorChain = () => {
      const obj = {
        insert: () => obj,
        select: () => obj,
        single: () => Promise.resolve({ data: null, error: { message: 'insert failed' } }),
        eq: () => obj,
      };
      return obj;
    };
    const db = { from: () => errorChain() };
    const svc = new OnboardingService(db);
    const result = await svc.logOnboardingEvent('agent-1', 'email_verified', 'started');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'insert failed');
  });

  // logOnboardingEvent — success path (non-completed status)
  await test('logOnboardingEvent: returns success on valid non-completed event', async () => {
    const fakeEvent = { id: 'evt-1', agent_id: 'agent-1', step_name: 'fub_connected', status: 'started' };
    const chain = () => {
      const obj = {
        insert: () => obj,
        select: () => obj,
        single: () => Promise.resolve({ data: fakeEvent, error: null }),
        eq: () => obj,
      };
      return obj;
    };
    const db = { from: () => chain() };
    const svc = new OnboardingService(db);
    const result = await svc.logOnboardingEvent('agent-1', 'fub_connected', 'started');
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.event, fakeEvent);
  });

  // getFunnelStatus
  await test('getFunnelStatus: returns agents with time_at_step_hours', async () => {
    const now = new Date();
    const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();
    const fakeAgents = [
      { id: 'a1', onboarding_step: 2, last_onboarding_step_update: thirtyHoursAgo },
    ];

    const chain = () => {
      const obj = {
        select: () => obj,
        order: () => obj,
        then: (resolve) => resolve({ data: fakeAgents, error: null }),
      };
      return obj;
    };
    const db = { from: () => chain() };
    const svc = new OnboardingService(db);
    const result = await svc.getFunnelStatus();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.agents.length, 1);
    assert.ok(result.agents[0].is_stuck);
    assert.ok(result.agents[0].time_at_step_hours >= 30);
  });

  // getFunnelStatus — db error
  await test('getFunnelStatus: returns failure on db error', async () => {
    const chain = () => {
      const obj = {
        select: () => obj,
        order: () => obj,
        then: (resolve) => resolve({ data: null, error: { message: 'query error' } }),
      };
      return obj;
    };
    const db = { from: () => chain() };
    const svc = new OnboardingService(db);
    const result = await svc.getFunnelStatus();
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'query error');
  });

  // getFunnelConversions
  await test('getFunnelConversions: returns conversions on success', async () => {
    const fakeConversions = [{ step: 1, rate: 0.8 }];
    const chain = () => {
      const obj = {
        select: () => Promise.resolve({ data: fakeConversions, error: null }),
      };
      return obj;
    };
    const db = { from: () => chain() };
    const svc = new OnboardingService(db);
    const result = await svc.getFunnelConversions();
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.conversions, fakeConversions);
  });

  // checkAndAlertStuckAgents — no stuck agents
  await test('checkAndAlertStuckAgents: returns 0 alerts when no stuck agents', async () => {
    const recentUpdate = new Date().toISOString();
    const fakeAgents = [{ id: 'a1', onboarding_step: 1, last_onboarding_step_update: recentUpdate }];

    const chain = () => {
      const obj = {
        select: () => obj,
        order: () => obj,
        then: (resolve) => resolve({ data: fakeAgents, error: null }),
      };
      return obj;
    };
    const db = { from: () => chain() };
    const svc = new OnboardingService(db);
    const result = await svc.checkAndAlertStuckAgents();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.alerts_created, 0);
  });

  // createStuckAlerts — empty array
  await test('createStuckAlerts: handles empty array', async () => {
    const db = makeMockDb();
    const svc = new OnboardingService(db);
    const result = await svc.createStuckAlerts([]);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.alerts_created, 0);
  });

  // getOnboardingEvents
  await test('getOnboardingEvents: returns events', async () => {
    const fakeEvents = [{ id: 'e1', agent_id: 'a1', step_name: 'email_verified' }];
    const chain = () => {
      const obj = {
        select: () => obj,
        order: () => obj,
        eq: () => obj,
        limit: () => Promise.resolve({ data: fakeEvents, error: null }),
      };
      return obj;
    };
    const db = { from: () => chain() };
    const svc = new OnboardingService(db);
    const result = await svc.getOnboardingEvents();
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.events, fakeEvents);
  });

  await test('getOnboardingEvents: filters by agentId when provided', async () => {
    const fakeEvents = [{ id: 'e1', agent_id: 'a1' }];
    let eqCalled = false;
    const chain = () => {
      const obj = {
        select: () => obj,
        order: () => obj,
        eq: (col) => { if (col === 'agent_id') eqCalled = true; return obj; },
        limit: () => Promise.resolve({ data: fakeEvents, error: null }),
      };
      return obj;
    };
    const db = { from: () => chain() };
    const svc = new OnboardingService(db);
    await svc.getOnboardingEvents('agent-123');
    assert.ok(eqCalled, 'eq() should be called when agentId is provided');
  });

  // Backward-compat shim
  await test('shim: exports same functions as original API', () => {
    const shim = require('../../lib/onboarding-telemetry');
    assert.strictEqual(typeof shim.logOnboardingEvent, 'function');
    assert.strictEqual(typeof shim.getFunnelStatus, 'function');
    assert.strictEqual(typeof shim.getFunnelConversions, 'function');
    assert.strictEqual(typeof shim.checkAndAlertStuckAgents, 'function');
    assert.strictEqual(typeof shim.createStuckAlerts, 'function');
    assert.strictEqual(typeof shim.getOnboardingEvents, 'function');
    assert.strictEqual(typeof shim.isSmokTestAccount, 'function');
    assert.strictEqual(typeof shim.STEP_INDEX, 'object');
    assert.ok(Array.isArray(shim.STEP_NAMES));
  });

  await test('shim: isSmokTestAccount works via shim', () => {
    const { isSmokTestAccount } = require('../../lib/onboarding-telemetry');
    assert.ok(isSmokTestAccount('smoke-test@foo.com'));
    assert.strictEqual(isSmokTestAccount('normal@email.com'), false);
  });

  // Summary
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});
