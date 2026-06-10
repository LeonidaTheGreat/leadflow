'use strict';

/**
 * Unit tests for scripts/tasks/revenue-snapshot.js exported functions.
 * Uses a mock pool to avoid real DB access.
 */

const assert = require('assert');
const path = require('path');
const { computeRevenueSnapshot, upsertRevenueSnapshot, sendFunnelDropAlerts } =
  require(path.join(__dirname, '../../scripts/tasks/revenue-snapshot'));

// Mock query responses keyed on SQL fragment patterns
function createMockPool(overrides = {}) {
  const defaults = {
    activeSubscribers: 3,
    trialUsers: 10,
    mrrCents: 44700,
    newSubscribers: 1,
    totalAgents: 20,
    integrationsCount: 8,
    ahaCount: 7,
    pilotIdentified: 15,
    pilotContacted: 4,
  };
  const cfg = Object.assign({}, defaults, overrides);

  return {
    async query(sql, params) {
      // active subscribers
      if (sql.includes("FROM subscriptions WHERE status = 'active'") && sql.includes('COUNT')) {
        return { rows: [{ count: cfg.activeSubscribers }] };
      }
      // trial users
      if (sql.includes('FROM real_estate_agents') && sql.includes('trial_ends_at')) {
        return { rows: [{ count: cfg.trialUsers }] };
      }
      // mrr
      if (sql.includes('SUM(') && sql.includes('CASE tier')) {
        return { rows: [{ mrr_cents: cfg.mrrCents }] };
      }
      // new subscribers (created_at)
      if (sql.includes('FROM subscriptions') && sql.includes('created_at')) {
        return { rows: [{ count: cfg.newSubscribers }] };
      }
      // total agents (no WHERE)
      if (sql.includes('FROM real_estate_agents') && !sql.includes('WHERE')) {
        return { rows: [{ count: cfg.totalAgents }] };
      }
      // aha completed
      if (sql.includes('FROM real_estate_agents') && sql.includes('aha_completed = true')) {
        return { rows: [{ count: cfg.ahaCount }] };
      }
      // agent_integrations
      if (sql.includes('FROM agent_integrations')) {
        return { rows: [{ count: cfg.integrationsCount }] };
      }
      // pilot contacted (has $1 param for status array)
      if (sql.includes('FROM pilot_recruitment_targets') && params && params.length > 0) {
        return { rows: [{ count: cfg.pilotContacted }] };
      }
      // pilot identified
      if (sql.includes('FROM pilot_recruitment_targets')) {
        return { rows: [{ count: cfg.pilotIdentified }] };
      }
      return { rows: [{ count: 0 }] };
    },
  };
}

// ── computeRevenueSnapshot ─────────────────────────────────────────────────

async function testComputeBasicCounts() {
  const pool = createMockPool();
  const snap = await computeRevenueSnapshot(pool);

  assert.strictEqual(snap.active_subscribers, 3);
  assert.strictEqual(snap.trial_users, 10);
  assert.strictEqual(snap.mrr_cents, 44700);
  assert.strictEqual(snap.new_subscribers, 1);
  assert.strictEqual(snap.project_id, 'leadflow');
  assert.strictEqual(typeof snap.date, 'string');
  assert.match(snap.date, /^\d{4}-\d{2}-\d{2}$/);
}

async function testComputeRates() {
  const pool = createMockPool({ activeSubscribers: 3, trialUsers: 10, integrationsCount: 8, ahaCount: 7, totalAgents: 20 });
  const snap = await computeRevenueSnapshot(pool);

  // conversion_rate = 3 / (3 + 10) ≈ 0.2308
  assert.strictEqual(snap.conversion_rate, 0.2308);
  // fub_activation_rate = 8 / 20 = 0.4
  assert.strictEqual(snap.data.fub_activation_rate, 0.4);
  // aha_completion_rate = 7 / 20 = 0.35
  assert.strictEqual(snap.data.aha_completion_rate, 0.35);
  // pilot_contacted_rate = 4 / 15 ≈ 0.2667
  assert.strictEqual(snap.data.pilot_contacted_rate, 0.2667);
}

async function testComputeZeroDenominators() {
  const pool = createMockPool({
    activeSubscribers: 0,
    trialUsers: 0,
    totalAgents: 0,
    integrationsCount: 0,
    ahaCount: 0,
    pilotIdentified: 0,
    pilotContacted: 0,
  });
  const snap = await computeRevenueSnapshot(pool);

  assert.strictEqual(snap.conversion_rate, 0);
  assert.strictEqual(snap.data.fub_activation_rate, 0);
  assert.strictEqual(snap.data.aha_completion_rate, 0);
  assert.strictEqual(snap.data.pilot_contacted_rate, 0);
  assert.strictEqual(snap.arpu_cents, 0);
}

async function testComputeArpu() {
  const pool = createMockPool({ activeSubscribers: 4, mrrCents: 59600 });
  const snap = await computeRevenueSnapshot(pool);
  assert.strictEqual(snap.arpu_cents, 14900);
}

// ── upsertRevenueSnapshot ──────────────────────────────────────────────────

async function testUpsertCallsQueryWithCorrectParams() {
  let capturedSql = '';
  let capturedParams = [];
  const pool = {
    async query(sql, params) {
      capturedSql = sql;
      capturedParams = params;
      return { rows: [{ id: 99, project_id: 'leadflow', date: '2026-01-01' }] };
    },
  };

  const snapshot = {
    project_id: 'leadflow',
    date: '2026-01-01',
    mrr_cents: 0,
    active_subscribers: 0,
    trial_users: 5,
    churned_count: 0,
    new_subscribers: 1,
    conversion_rate: 0,
    arpu_cents: 0,
    data: { fub_activation_rate: 0.1, aha_completion_rate: 0.05 },
  };

  const result = await upsertRevenueSnapshot(pool, snapshot);

  assert.strictEqual(result.id, 99);
  assert(capturedSql.includes('INSERT INTO revenue_metrics'));
  assert(capturedSql.includes('ON CONFLICT'));
  assert.strictEqual(capturedParams[0], 'leadflow');
  assert.strictEqual(capturedParams[1], '2026-01-01');
  // data param is JSON-serialised
  const dataArg = JSON.parse(capturedParams[9]);
  assert.strictEqual(dataArg.fub_activation_rate, 0.1);
}

// ── sendFunnelDropAlerts ───────────────────────────────────────────────────

async function testAlertsNoBreaches() {
  const snap = {
    date: '2026-01-01',
    data: { fub_activation_rate: 0.5, aha_completion_rate: 0.6 },
  };
  const result = await sendFunnelDropAlerts(snap);
  assert.strictEqual(result.triggered, 0);
}

async function testAlertsFubBreach() {
  const snap = {
    date: '2026-01-01',
    data: { fub_activation_rate: 0.1, aha_completion_rate: 0.6 },
  };
  const result = await sendFunnelDropAlerts(snap);
  assert.strictEqual(result.triggered, 1);
}

async function testAlertsAhaBreach() {
  const snap = {
    date: '2026-01-01',
    data: { fub_activation_rate: 0.5, aha_completion_rate: 0.1 },
  };
  const result = await sendFunnelDropAlerts(snap);
  assert.strictEqual(result.triggered, 1);
}

async function testAlertsBothBreaches() {
  const snap = {
    date: '2026-01-01',
    data: { fub_activation_rate: 0.05, aha_completion_rate: 0.05 },
  };
  const result = await sendFunnelDropAlerts(snap);
  assert.strictEqual(result.triggered, 2);
}

async function testAlertsExactThreshold() {
  // At exactly 0.2 and 0.3 — no breach (< is strict)
  const snap = {
    date: '2026-01-01',
    data: { fub_activation_rate: 0.2, aha_completion_rate: 0.3 },
  };
  const result = await sendFunnelDropAlerts(snap);
  assert.strictEqual(result.triggered, 0);
}

// ── runner ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

(async () => {
  console.log('\nrevenue-snapshot unit tests\n');

  await run('computeRevenueSnapshot — basic counts', testComputeBasicCounts);
  await run('computeRevenueSnapshot — rates', testComputeRates);
  await run('computeRevenueSnapshot — zero denominators', testComputeZeroDenominators);
  await run('computeRevenueSnapshot — arpu', testComputeArpu);
  await run('upsertRevenueSnapshot — SQL params', testUpsertCallsQueryWithCorrectParams);
  await run('sendFunnelDropAlerts — no breaches', testAlertsNoBreaches);
  await run('sendFunnelDropAlerts — FUB breach', testAlertsFubBreach);
  await run('sendFunnelDropAlerts — aha breach', testAlertsAhaBreach);
  await run('sendFunnelDropAlerts — both breaches', testAlertsBothBreaches);
  await run('sendFunnelDropAlerts — exact threshold (no breach)', testAlertsExactThreshold);

  console.log(`\n  Passed: ${passed} | Failed: ${failed}\n`);
  if (failed > 0) process.exit(1);
})();
