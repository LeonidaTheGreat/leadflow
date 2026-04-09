/**
 * E2E Test: feat-weekly-performance-email
 * Weekly AI Performance Report — cron route, service logic, DB schema
 *
 * Runnable with: node tests/e2e/feat-weekly-performance-email.test.js
 */

const assert = require('assert');
const { Client } = require('pg');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      }).catch(err => {
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

async function run() {
  console.log('\n=== feat-weekly-performance-email E2E Tests ===\n');

  // --- 1. Service: getPreviousWeekRange() ---
  console.log('1. Service logic (pure functions, no network)');

  const svc = require('../../lib/weekly-performance-service');

  await test('getPreviousWeekRange returns week_starting and week_ending', async () => {
    const range = svc.getPreviousWeekRange();
    assert.ok(range.weekStarting, 'weekStarting missing');
    assert.ok(range.weekEnding, 'weekEnding missing');
    assert.match(range.weekStarting, /^\d{4}-\d{2}-\d{2}$/, 'weekStarting not a date');
    assert.match(range.weekEnding, /^\d{4}-\d{2}-\d{2}$/, 'weekEnding not a date');
  });

  await test('getPreviousWeekRange: weekStarting <= weekEnding', async () => {
    const range = svc.getPreviousWeekRange();
    assert.ok(range.weekStarting <= range.weekEnding, 'weekStarting is after weekEnding');
  });

  await test('getPreviousWeekRange: weekEnding is a Sunday (BUG: fails on UTC- systems due to timezone)', async () => {
    const range = svc.getPreviousWeekRange();
    const end = new Date(range.weekEnding + 'T12:00:00'); // noon to avoid TZ ambiguity
    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][end.getDay()];
    assert.strictEqual(end.getDay(), 0, `weekEnding should be Sunday but got ${dayName} (${range.weekEnding}) — timezone bug: setHours() uses local time but toISOString() converts to UTC`);
  });

  await test('generateEmailHtml returns non-empty HTML string', async () => {
    const stats = {
      leadsResponded: 5,
      avgResponseTimeSeconds: 25,
      appointmentsBooked: 2,
      estimatedRevenueImpact: 2250
    };
    const agent = { first_name: 'Test', plan_tier: 'starter' };
    const weekRange = { weekStarting: '2026-03-30', weekEnding: '2026-04-05' };
    const html = svc.generateEmailHtml(agent, stats, weekRange);
    assert.ok(typeof html === 'string', 'Expected HTML string');
    assert.ok(html.length > 100, 'HTML too short');
    assert.ok(html.includes('Test'), 'HTML missing agent name');
    assert.ok(html.includes('5'), 'HTML missing leads count');
  });

  await test('generateEmailHtml includes upgrade CTA for starter plan', async () => {
    const stats = { leadsResponded: 3, avgResponseTimeSeconds: 28, appointmentsBooked: 1, estimatedRevenueImpact: 1125 };
    const agent = { first_name: 'Jane', plan_tier: 'starter' };
    const weekRange = { weekStarting: '2026-03-30', weekEnding: '2026-04-05' };
    const html = svc.generateEmailHtml(agent, stats, weekRange);
    assert.ok(html.toLowerCase().includes('upgrade') || html.toLowerCase().includes('pro'), 'Missing upgrade CTA for starter plan');
  });

  await test('generateEmailHtml does NOT include upgrade CTA for pro plan', async () => {
    const stats = { leadsResponded: 10, avgResponseTimeSeconds: 22, appointmentsBooked: 4, estimatedRevenueImpact: 4500 };
    const agent = { first_name: 'Pro', plan_tier: 'pro' };
    const weekRange = { weekStarting: '2026-03-30', weekEnding: '2026-04-05' };
    const html = svc.generateEmailHtml(agent, stats, weekRange);
    // Pro users should not see an upgrade CTA to pro
    const hasAggressiveUpgradeCTA = html.includes('Upgrade to Pro') || html.includes('upgrade to Pro');
    assert.ok(!hasAggressiveUpgradeCTA, 'Pro plan should not see "Upgrade to Pro" CTA');
  });

  // --- 2. DB schema: weekly_performance_email_logs table ---
  console.log('\n2. DB schema');

  const pgUrl = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';
  const client = new Client({ connectionString: pgUrl });
  let dbConnected = false;

  try {
    await client.connect();
    dbConnected = true;
  } catch (e) {
    console.log(`  ⚠ DB unavailable (${e.message}), skipping schema tests`);
  }

  if (dbConnected) {
    await test('weekly_performance_email_logs table exists', async () => {
      const res = await client.query(`SELECT to_regclass('public.weekly_performance_email_logs') AS tbl`);
      assert.ok(res.rows[0].tbl, 'Table weekly_performance_email_logs does not exist');
    });

    await test('weekly_performance_email_logs has required columns', async () => {
      const res = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'weekly_performance_email_logs'
      `);
      const cols = res.rows.map(r => r.column_name);
      const required = ['id', 'agent_id', 'week_starting', 'week_ending', 'recipient_email', 'status', 'sent_at'];
      for (const col of required) {
        assert.ok(cols.includes(col), `Missing column: ${col}`);
      }
    });

    await test('weekly_performance_email_logs unique constraint on (agent_id, week_starting)', async () => {
      const res = await client.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'weekly_performance_email_logs'
          AND indexdef LIKE '%agent_id%week_starting%'
      `);
      assert.ok(res.rows.length > 0, 'Missing unique index on (agent_id, week_starting)');
    });

    await client.end();
  }

  // --- 3. Cron endpoint: route file exists and is Express-compatible ---
  console.log('\n3. Express cron route');

  await test('lib/weekly-performance-service.js exports runWeeklyReportSequence', async () => {
    assert.ok(typeof svc.runWeeklyReportSequence === 'function', 'runWeeklyReportSequence not exported');
  });

  await test('vercel.json includes /api/cron/weekly-performance cron entry', async () => {
    const vercelConfig = require('../../vercel.json');
    assert.ok(Array.isArray(vercelConfig.crons), 'vercel.json missing crons array');
    const cronEntry = vercelConfig.crons.find(c => c.path === '/api/cron/weekly-performance');
    assert.ok(cronEntry, 'Missing cron entry for /api/cron/weekly-performance');
    assert.ok(cronEntry.schedule, 'Cron entry missing schedule');
  });

  // --- Summary ---
  console.log(`\n${'='.repeat(45)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(45));

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
