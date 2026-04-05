/**
 * QC Integration Test: Funnel Diagnostics — Trial Activation Analysis
 * Task: 978a56ba-4a9b-48d3-b17a-7708c4c0f66c
 *
 * Tests real DB behavior — creates seed data, runs the actual SQL from the
 * Express route (funnel-diagnostics.js), verifies segment logic. No server needed.
 */

'use strict';

const assert = require('assert');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const PG_URL = process.env.LOCAL_PG_URL;
if (!PG_URL) {
  console.error('FATAL: LOCAL_PG_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: PG_URL });

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

const PREFIX = 'qc-funnel-diag-';

async function cleanup() {
  const { rows: agents } = await pool.query(
    `SELECT id FROM real_estate_agents WHERE email LIKE $1`,
    [`${PREFIX}%@qc.test`]
  );
  const ids = agents.map(r => r.id);
  if (ids.length > 0) {
    const { rows: leads } = await pool.query(
      `SELECT id FROM leads WHERE agent_id = ANY($1)`, [ids]
    );
    const leadIds = leads.map(r => r.id);
    if (leadIds.length > 0) {
      await pool.query(`DELETE FROM sms_messages WHERE lead_id = ANY($1)`, [leadIds]);
      await pool.query(`DELETE FROM leads WHERE id = ANY($1)`, [leadIds]);
    }
    await pool.query(`DELETE FROM agent_integrations WHERE agent_id = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM real_estate_agents WHERE id = ANY($1)`, [ids]);
  }
}

async function createAgent(suffix, status) {
  const subStatus = status || 'inactive';
  const { rows } = await pool.query(
    `INSERT INTO real_estate_agents
       (email, first_name, last_name, password_hash, trial_ends_at, subscription_status)
     VALUES ($1, 'QC', $2, 'qchash', NOW() + INTERVAL '7 days', $3)
     RETURNING id`,
    [`${PREFIX}${suffix}@qc.test`, suffix, subStatus]
  );
  return rows[0].id;
}

// The actual CTE SQL from funnel-diagnostics.js (Express route), parameterized.
// Matches exactly what production uses.
const SEGMENT_SQL = `
  WITH trial_agents AS (
    SELECT
      ra.id              AS agent_id,
      ra.email,
      ra.first_name,
      ra.last_name,
      ra.trial_ends_at,
      ra.created_at      AS trial_started_at,
      EXTRACT(DAY FROM (ra.trial_ends_at - NOW()))::integer AS days_remaining
    FROM real_estate_agents ra
    WHERE ra.trial_ends_at IS NOT NULL
      AND (ra.subscription_status IS NULL OR ra.subscription_status NOT IN ('active', 'canceled'))
  ),
  fub_status AS (
    SELECT
      agent_id,
      (follow_up_boss_api_key IS NOT NULL AND follow_up_boss_api_key != '') AS fub_connected,
      updated_at AS fub_connected_at
    FROM agent_integrations
  ),
  lead_activity AS (
    SELECT
      agent_id,
      COUNT(*) FILTER (WHERE created_at >= NOW() - ($1 || ' days')::interval) AS leads_last_nd,
      MAX(created_at) AS last_lead_at
    FROM leads
    GROUP BY agent_id
  ),
  sms_activity AS (
    SELECT
      l.agent_id,
      COUNT(*) FILTER (
        WHERE sm.created_at >= NOW() - ($1 || ' days')::interval
          AND sm.direction = 'outbound'
      ) AS sms_sent_last_nd,
      MAX(sm.created_at) AS last_sms_at
    FROM sms_messages sm
    JOIN leads l ON sm.lead_id = l.id
    WHERE sm.direction = 'outbound'
    GROUP BY l.agent_id
  )
  SELECT
    ta.agent_id,
    ta.email,
    ta.days_remaining,
    COALESCE(fs.fub_connected, false)    AS fub_connected,
    COALESCE(la.leads_last_nd, 0)        AS leads_last_nd,
    COALESCE(sa.sms_sent_last_nd, 0)     AS sms_sent_last_nd,
    GREATEST(la.last_lead_at, sa.last_sms_at) AS last_activity_at,
    CASE
      WHEN COALESCE(fs.fub_connected, false)
           AND COALESCE(la.leads_last_nd, 0) > 0
           AND COALESCE(sa.sms_sent_last_nd, 0) > 0
      THEN 'active'
      WHEN COALESCE(fs.fub_connected, false)
      THEN 'onboarded'
      ELSE 'never_activated'
    END AS activation_segment
  FROM trial_agents ta
  LEFT JOIN fub_status fs    ON fs.agent_id = ta.agent_id
  LEFT JOIN lead_activity la ON la.agent_id = ta.agent_id
  LEFT JOIN sms_activity sa  ON sa.agent_id = ta.agent_id
  ORDER BY ta.trial_ends_at ASC
`;

async function getSegmentForAgent(agentId) {
  const { rows } = await pool.query(SEGMENT_SQL, ['7']);
  const row = rows.find(r => r.agent_id === agentId);
  return row ? row.activation_segment : null;
}

async function runTests() {
  console.log('\n=== QC Integration Test: Funnel Diagnostics ===\n');
  await cleanup();

  // Test 1: Never-activated (no agent_integrations row at all)
  await test('AC-5: Agent with no FUB row classifies as never_activated', async () => {
    const id = await createAgent('never');
    try {
      const seg = await getSegmentForAgent(id);
      assert.strictEqual(seg, 'never_activated', `Got: ${seg}`);
    } finally {
      await cleanup();
    }
  });

  // Test 2: Never-activated with empty string FUB key
  await test('AC-5: Agent with empty string FUB key classifies as never_activated', async () => {
    const id = await createAgent('never-empty');
    try {
      await pool.query(
        `INSERT INTO agent_integrations (agent_id, follow_up_boss_api_key) VALUES ($1, '')`,
        [id]
      );
      const seg = await getSegmentForAgent(id);
      assert.strictEqual(seg, 'never_activated', `Got: ${seg}`);
    } finally {
      await cleanup();
    }
  });

  // Test 3: Onboarded — FUB set, no recent activity
  await test('AC-4: Agent with FUB key but no leads/SMS classifies as onboarded', async () => {
    const id = await createAgent('onboarded');
    try {
      await pool.query(
        `INSERT INTO agent_integrations (agent_id, follow_up_boss_api_key) VALUES ($1, 'test-key-xyz')`,
        [id]
      );
      const seg = await getSegmentForAgent(id);
      assert.strictEqual(seg, 'onboarded', `Got: ${seg}`);
    } finally {
      await cleanup();
    }
  });

  // Test 4: Active — FUB + lead + outbound SMS within 7 days
  await test('AC-3: Agent with FUB + recent lead + recent outbound SMS classifies as active', async () => {
    const id = await createAgent('active');
    try {
      await pool.query(
        `INSERT INTO agent_integrations (agent_id, follow_up_boss_api_key) VALUES ($1, 'test-key-active')`,
        [id]
      );
      const { rows: leadRows } = await pool.query(
        `INSERT INTO leads (agent_id, phone, source, created_at) VALUES ($1, '+15550000002', 'test', NOW()) RETURNING id`,
        [id]
      );
      const leadId = leadRows[0].id;
      await pool.query(
        `INSERT INTO sms_messages (lead_id, direction, message_body, created_at) VALUES ($1, 'outbound', 'hi', NOW())`,
        [leadId]
      );
      const seg = await getSegmentForAgent(id);
      assert.strictEqual(seg, 'active', `Got: ${seg}`);
    } finally {
      await cleanup();
    }
  });

  // Test 5: Onboarded — FUB + lead but ONLY inbound SMS (not outbound)
  await test('AC-4: Agent with FUB + lead + inbound-only SMS classifies as onboarded (not active)', async () => {
    const id = await createAgent('inbound-only');
    try {
      await pool.query(
        `INSERT INTO agent_integrations (agent_id, follow_up_boss_api_key) VALUES ($1, 'test-key-inbound')`,
        [id]
      );
      const { rows: leadRows } = await pool.query(
        `INSERT INTO leads (agent_id, phone, source, created_at) VALUES ($1, '+15550000003', 'test', NOW()) RETURNING id`,
        [id]
      );
      const leadId = leadRows[0].id;
      await pool.query(
        `INSERT INTO sms_messages (lead_id, direction, message_body, created_at) VALUES ($1, 'inbound', 'reply', NOW())`,
        [leadId]
      );
      const seg = await getSegmentForAgent(id);
      assert.strictEqual(seg, 'onboarded', `Inbound SMS should not count toward Active, got: ${seg}`);
    } finally {
      await cleanup();
    }
  });

  // Test 6: Onboarded — FUB + lead + SMS but SMS/lead older than 7 days
  await test('AC-4: Agent with FUB + lead + SMS older than 7 days classifies as onboarded (not active)', async () => {
    const id = await createAgent('stale-sms');
    try {
      await pool.query(
        `INSERT INTO agent_integrations (agent_id, follow_up_boss_api_key) VALUES ($1, 'test-key-stale')`,
        [id]
      );
      const { rows: leadRows } = await pool.query(
        `INSERT INTO leads (agent_id, phone, source, created_at) VALUES ($1, '+15550000004', 'test', NOW() - INTERVAL '8 days') RETURNING id`,
        [id]
      );
      const leadId = leadRows[0].id;
      await pool.query(
        `INSERT INTO sms_messages (lead_id, direction, message_body, created_at) VALUES ($1, 'outbound', 'old', NOW() - INTERVAL '8 days')`,
        [leadId]
      );
      const seg = await getSegmentForAgent(id);
      assert.strictEqual(seg, 'onboarded', `8-day-old activity should not make agent Active, got: ${seg}`);
    } finally {
      await cleanup();
    }
  });

  // Test 7: Paid agent excluded from results
  await test('AC-2: Paid agents (subscription_status=active) excluded from trial list', async () => {
    const id = await createAgent('paid', 'active');
    try {
      const seg = await getSegmentForAgent(id);
      assert.strictEqual(seg, null, `Paid agent must not appear in results, got: ${seg}`);
    } finally {
      await cleanup();
    }
  });

  // Test 8: Canceled agent excluded
  await test('AC-2: Canceled agents (subscription_status=canceled) excluded from trial list', async () => {
    const id = await createAgent('canceled', 'canceled');
    try {
      const seg = await getSegmentForAgent(id);
      assert.strictEqual(seg, null, `Canceled agent must not appear in results, got: ${seg}`);
    } finally {
      await cleanup();
    }
  });

  // Test 9: All three agents appear exactly once (exhaustive segmentation)
  await test('AC-2: All trial agents appear in exactly one segment (mutually exclusive)', async () => {
    const idNever = await createAgent('exhaust-never');
    const idOnboarded = await createAgent('exhaust-onboarded');
    const idActive = await createAgent('exhaust-active');
    try {
      await pool.query(
        `INSERT INTO agent_integrations (agent_id, follow_up_boss_api_key) VALUES ($1, 'fub-key-ob')`,
        [idOnboarded]
      );
      await pool.query(
        `INSERT INTO agent_integrations (agent_id, follow_up_boss_api_key) VALUES ($1, 'fub-key-ac')`,
        [idActive]
      );
      const { rows: leadRows } = await pool.query(
        `INSERT INTO leads (agent_id, phone, source, created_at) VALUES ($1, '+15550000005', 'test', NOW()) RETURNING id`,
        [idActive]
      );
      await pool.query(
        `INSERT INTO sms_messages (lead_id, direction, message_body, created_at) VALUES ($1, 'outbound', 'msg', NOW())`,
        [leadRows[0].id]
      );

      const { rows } = await pool.query(SEGMENT_SQL, ['7']);
      const allIds = rows.map(r => r.agent_id);

      for (const id of [idNever, idOnboarded, idActive]) {
        const count = allIds.filter(i => i === id).length;
        assert.strictEqual(count, 1, `Agent ${id} appears ${count} times (expected 1)`);
      }

      // Verify their actual segments
      const segNever = rows.find(r => r.agent_id === idNever).activation_segment;
      const segOnboarded = rows.find(r => r.agent_id === idOnboarded).activation_segment;
      const segActive = rows.find(r => r.agent_id === idActive).activation_segment;
      assert.strictEqual(segNever, 'never_activated');
      assert.strictEqual(segOnboarded, 'onboarded');
      assert.strictEqual(segActive, 'active');
    } finally {
      await cleanup();
    }
  });

  // Test 10: days_remaining is a numeric integer
  await test('AC-1: days_remaining is a numeric integer in query output', async () => {
    const id = await createAgent('days-check');
    try {
      const { rows } = await pool.query(SEGMENT_SQL, ['7']);
      const row = rows.find(r => r.agent_id === id);
      assert.ok(row, 'Test agent must appear in results');
      assert.ok(
        Number.isInteger(Number(row.days_remaining)),
        `days_remaining must be integer, got: ${row.days_remaining}`
      );
      // Should be ~7 days (we created with 7 days)
      assert.ok(Number(row.days_remaining) >= 6 && Number(row.days_remaining) <= 7,
        `days_remaining ${row.days_remaining} should be 6 or 7 for a 7-day trial`);
    } finally {
      await cleanup();
    }
  });

  // Test 11: Auth guard — verify source code has 401 for missing/wrong key
  await test('AC-7: Next.js route has 401 auth guard with correct logic', async () => {
    const routePath = '/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/app/api/admin/funnel/trial-activation/route.ts';
    const src = fs.readFileSync(routePath, 'utf8');
    assert.ok(src.includes('401'), 'Must return 401');
    assert.ok(src.includes('verifyAdminAuth'), 'Must call verifyAdminAuth');
    assert.ok(src.includes('LEADFLOW_API_KEY'), 'Must check LEADFLOW_API_KEY');
    assert.ok(src.includes('if (!apiKey) return false'), 'Must handle missing env var safely');
    assert.ok(src.includes("startsWith('Bearer ')"), 'Must validate Bearer prefix');
  });

  // Test 12: No hardcoded secrets
  await test('Security: No hardcoded secrets in implementation files', async () => {
    const files = [
      '/Users/clawdbot/projects/leadflow/routes/admin/funnel-diagnostics.js',
      '/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/app/api/admin/funnel/trial-activation/route.ts',
    ];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      assert.ok(!/sk_live_[A-Za-z0-9]+/.test(src), `${f}: hardcoded Stripe live key`);
      assert.ok(!/password\s*=\s*["'][^"']{6,}["']/.test(src), `${f}: hardcoded password`);
    }
  });

  await pool.end();

  console.log(`\n=== QC Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
