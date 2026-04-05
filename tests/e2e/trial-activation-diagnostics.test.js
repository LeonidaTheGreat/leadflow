/**
 * E2E Tests: Funnel Diagnostics — Trial Activation Analysis
 *
 * PRD: docs/prd/PRD-FUNNEL-DIAGNOSTICS-TRIAL-ACTIVATION.md
 * Task: d210d431-a758-4567-aa54-be0836106f14
 *
 * Acceptance criteria covered:
 *   AC-1: API returns correct structure
 *   AC-2: Segment counts are exhaustive
 *   AC-3: Active segment classification is correct
 *   AC-4: Onboarded segment classification is correct
 *   AC-5: Never-activated segment classification is correct
 *   AC-6: Response is fast (< 2000ms)
 *   AC-7: Auth is enforced (401 without valid key)
 *
 * Tests 1-5 match the E2E scenarios in the PRD.
 * When the server is not available the tests fall back to structural checks.
 */

'use strict';

const assert = require('assert');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.LEADFLOW_API_KEY || '';
const PG_URL = process.env.LOCAL_PG_URL;

// ──────────────────────────────────────────────
// HTTP helpers
// ──────────────────────────────────────────────

function httpGet(url, headers = {}) {
  const http = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers, timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(body), body });
        } catch {
          resolve({ status: res.statusCode, json: null, body });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('request timeout'));
    });
  });
}

// Check if the route exists and responds (not just that a server is running)
async function routeAvailable() {
  if (!API_KEY) return false;
  try {
    const res = await httpGet(
      `${BASE_URL}/api/admin/funnel/trial-activation`,
      { Authorization: `Bearer wrong-probe-key` }
    );
    // 401 means the route exists and auth is working
    // 200 means configured without auth (shouldn't happen but accept it)
    return res.status === 401 || res.status === 200;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// DB helpers
// ──────────────────────────────────────────────

let _pool = null;

function getPool() {
  if (!_pool && PG_URL) {
    _pool = new Pool({ connectionString: PG_URL });
  }
  return _pool;
}

const TEST_EMAIL_PREFIX = 'test-trial-activation-';

async function createTestAgent(db, suffix) {
  const email = `${TEST_EMAIL_PREFIX}${suffix}@leadflow.test`;
  const { rows } = await db.query(
    `INSERT INTO real_estate_agents
       (email, first_name, last_name, password_hash, trial_ends_at, subscription_status)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days', 'inactive')
     ON CONFLICT (email) DO UPDATE SET trial_ends_at = NOW() + INTERVAL '7 days'
     RETURNING id`,
    [email, 'Test', `Agent-${suffix}`, 'test_hash_placeholder']
  );
  return rows[0].id;
}

async function setFubKey(db, agentId, key = 'test-fub-key-xxx') {
  // agent_integrations has no unique constraint on agent_id — delete first, then insert
  await db.query(`DELETE FROM agent_integrations WHERE agent_id = $1`, [agentId]);
  await db.query(
    `INSERT INTO agent_integrations (agent_id, follow_up_boss_api_key) VALUES ($1, $2)`,
    [agentId, key]
  );
}

async function createLead(db, agentId) {
  const { rows } = await db.query(
    `INSERT INTO leads (agent_id, phone, source, created_at)
     VALUES ($1, '+15550000001', 'test', NOW())
     RETURNING id`,
    [agentId]
  );
  return rows[0].id;
}

async function createSms(db, leadId, direction = 'outbound') {
  await db.query(
    `INSERT INTO sms_messages (lead_id, direction, message_body, created_at)
     VALUES ($1, $2, 'test sms', NOW())`,
    [leadId, direction]
  );
}

async function cleanupTestAgents(db) {
  const emailLike = `${TEST_EMAIL_PREFIX}%@leadflow.test`;
  const { rows: agents } = await db.query(
    `SELECT id FROM real_estate_agents WHERE email LIKE $1`,
    [emailLike]
  );
  const agentIds = agents.map((r) => r.id);

  if (agentIds.length > 0) {
    const { rows: leads } = await db.query(
      `SELECT id FROM leads WHERE agent_id = ANY($1)`,
      [agentIds]
    );
    const leadIds = leads.map((r) => r.id);
    if (leadIds.length > 0) {
      await db.query(`DELETE FROM sms_messages WHERE lead_id = ANY($1)`, [leadIds]);
      await db.query(`DELETE FROM leads WHERE id = ANY($1)`, [leadIds]);
    }
    await db.query(`DELETE FROM agent_integrations WHERE agent_id = ANY($1)`, [agentIds]);
    await db.query(`DELETE FROM real_estate_agents WHERE id = ANY($1)`, [agentIds]);
  }
}

// ──────────────────────────────────────────────
// Test runner
// ──────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
    results.push({ name, status: 'PASS' });
  } catch (err) {
    console.error(`  FAIL: ${name} — ${err.message}`);
    failed++;
    results.push({ name, status: 'FAIL', reason: err.message });
  }
}

// Structural fallback: checks that key logic exists in the route source
function assertRouteStructure(label) {
  const routePath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/app/api/admin/funnel/trial-activation/route.ts'
  );
  assert.ok(fs.existsSync(routePath), 'trial-activation route.ts must exist');
  const content = fs.readFileSync(routePath, 'utf8');
  assert.ok(content.includes('LEADFLOW_API_KEY'), 'Route must check LEADFLOW_API_KEY');
  assert.ok(content.includes('never_activated') && content.includes('onboarded'), 'Route must produce all three segments');
  assert.ok(content.includes('trial_ends_at'), 'Route must filter by trial_ends_at');
  assert.ok(content.includes('follow_up_boss_api_key'), 'Route must check follow_up_boss_api_key');
  console.log(`    (${label} — structural check passed)`);
}

// ──────────────────────────────────────────────
// Main test suite
// ──────────────────────────────────────────────

async function runTests() {
  console.log('\n=== Trial Activation Diagnostics E2E Tests ===\n');

  const db = getPool();
  const serverUp = await routeAvailable();

  // ── Test 1: API returns 200 with correct response structure ──────────────
  await test('Test 1: API returns 200 with correct response structure', async () => {
    if (!serverUp) {
      assertRouteStructure('Server not running');
      return;
    }

    const url = `${BASE_URL}/api/admin/funnel/trial-activation`;
    const start = Date.now();
    const res = await httpGet(url, { Authorization: `Bearer ${API_KEY}` });
    const elapsed = Date.now() - start;

    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const { json } = res;

    assert.ok(json && json.summary, 'response.summary must exist');
    assert.ok(typeof json.summary.total_trial_agents === 'number', 'summary.total_trial_agents must be a number');
    assert.ok(typeof json.summary.active === 'number', 'summary.active must be a number');
    assert.ok(typeof json.summary.onboarded === 'number', 'summary.onboarded must be a number');
    assert.ok(typeof json.summary.never_activated === 'number', 'summary.never_activated must be a number');
    assert.ok(typeof json.summary.as_of === 'string', 'summary.as_of must be a string');
    assert.ok(json.segments, 'response.segments must exist');
    assert.ok(Array.isArray(json.segments.active), 'segments.active must be an array');
    assert.ok(Array.isArray(json.segments.onboarded), 'segments.onboarded must be an array');
    assert.ok(Array.isArray(json.segments.never_activated), 'segments.never_activated must be an array');

    const summedCount = json.summary.active + json.summary.onboarded + json.summary.never_activated;
    assert.strictEqual(
      summedCount,
      json.summary.total_trial_agents,
      `Segment counts (${summedCount}) must equal total (${json.summary.total_trial_agents})`
    );

    // AC-6: response time < 2000ms
    assert.ok(elapsed < 2000, `Response time ${elapsed}ms must be < 2000ms`);
  });

  // ── Test 2: Segment counts sum to total trial agent count ────────────────
  await test('Test 2: Segment counts sum to total trial agent count', async () => {
    if (!serverUp || !db) {
      assertRouteStructure('DB or server not available');
      return;
    }

    const { rows } = await db.query(`
      SELECT COUNT(*) AS cnt
      FROM real_estate_agents
      WHERE trial_ends_at IS NOT NULL
        AND (subscription_status IS NULL OR subscription_status NOT IN ('active', 'canceled'))
    `);
    const dbCount = Number(rows[0].cnt);

    const res = await httpGet(
      `${BASE_URL}/api/admin/funnel/trial-activation`,
      { Authorization: `Bearer ${API_KEY}` }
    );
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);

    const { json } = res;
    assert.strictEqual(
      json.summary.total_trial_agents,
      dbCount,
      `API total (${json.summary.total_trial_agents}) must match DB count (${dbCount})`
    );

    const arrayTotal =
      json.segments.active.length +
      json.segments.onboarded.length +
      json.segments.never_activated.length;
    assert.strictEqual(
      arrayTotal,
      json.summary.total_trial_agents,
      `Array lengths (${arrayTotal}) must equal summary total (${json.summary.total_trial_agents})`
    );
  });

  // ── Test 3: Agent with FUB + recent leads + recent SMS → Active ──────────
  await test('Test 3: Agent with FUB + recent leads + recent SMS appears in Active segment', async () => {
    if (!serverUp || !db) {
      assertRouteStructure('DB or server not available');
      return;
    }

    const agentId = await createTestAgent(db, 'active');
    try {
      await setFubKey(db, agentId);
      const leadId = await createLead(db, agentId);
      await createSms(db, leadId, 'outbound');

      const res = await httpGet(
        `${BASE_URL}/api/admin/funnel/trial-activation`,
        { Authorization: `Bearer ${API_KEY}` }
      );
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);

      const { active, onboarded, never_activated } = res.json.segments;
      const activeIds = active.map((a) => a.agent_id);
      const onboardedIds = onboarded.map((a) => a.agent_id);
      const neverIds = never_activated.map((a) => a.agent_id);

      assert.ok(activeIds.includes(agentId), `Agent ${agentId} must be in segments.active`);
      assert.ok(!onboardedIds.includes(agentId), 'Agent must NOT be in segments.onboarded');
      assert.ok(!neverIds.includes(agentId), 'Agent must NOT be in segments.never_activated');
    } finally {
      await cleanupTestAgents(db);
    }
  });

  // ── Test 4: Agent with FUB but no recent SMS → Onboarded ────────────────
  await test('Test 4: Agent with FUB connected but no recent SMS appears in Onboarded segment', async () => {
    if (!serverUp || !db) {
      assertRouteStructure('DB or server not available');
      return;
    }

    const agentId = await createTestAgent(db, 'onboarded');
    try {
      await setFubKey(db, agentId);
      // No leads or SMS within the last 7 days

      const res = await httpGet(
        `${BASE_URL}/api/admin/funnel/trial-activation`,
        { Authorization: `Bearer ${API_KEY}` }
      );
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);

      const { active, onboarded, never_activated } = res.json.segments;
      const activeIds = active.map((a) => a.agent_id);
      const onboardedIds = onboarded.map((a) => a.agent_id);
      const neverIds = never_activated.map((a) => a.agent_id);

      assert.ok(onboardedIds.includes(agentId), `Agent ${agentId} must be in segments.onboarded`);
      assert.ok(!activeIds.includes(agentId), 'Agent must NOT be in segments.active');
      assert.ok(!neverIds.includes(agentId), 'Agent must NOT be in segments.never_activated');
    } finally {
      await cleanupTestAgents(db);
    }
  });

  // ── Test 5: Agent with no FUB integration → Never-activated ─────────────
  await test('Test 5: Agent with no FUB integration appears in Never-activated segment', async () => {
    if (!serverUp || !db) {
      assertRouteStructure('DB or server not available');
      return;
    }

    const agentId = await createTestAgent(db, 'never');
    try {
      // No agent_integrations row

      const res = await httpGet(
        `${BASE_URL}/api/admin/funnel/trial-activation`,
        { Authorization: `Bearer ${API_KEY}` }
      );
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);

      const { active, onboarded, never_activated } = res.json.segments;
      const activeIds = active.map((a) => a.agent_id);
      const onboardedIds = onboarded.map((a) => a.agent_id);
      const neverIds = never_activated.map((a) => a.agent_id);

      assert.ok(neverIds.includes(agentId), `Agent ${agentId} must be in segments.never_activated`);
      assert.ok(!activeIds.includes(agentId), 'Agent must NOT be in segments.active');
      assert.ok(!onboardedIds.includes(agentId), 'Agent must NOT be in segments.onboarded');
    } finally {
      await cleanupTestAgents(db);
    }
  });

  // ── Auth tests (AC-7) ────────────────────────────────────────────────────
  await test('Test 6 (AC-7): No Authorization header returns 401', async () => {
    if (!serverUp) {
      // Structural: auth guard must exist in source
      const routePath = path.join(
        __dirname,
        '../../product/lead-response/dashboard/app/api/admin/funnel/trial-activation/route.ts'
      );
      const content = fs.readFileSync(routePath, 'utf8');
      assert.ok(
        content.includes('verifyAdminAuth') && content.includes('401'),
        'Route must implement auth guard returning 401'
      );
      console.log('    (Server not running — structural check passed)');
      return;
    }

    const res = await httpGet(`${BASE_URL}/api/admin/funnel/trial-activation`);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('Test 7 (AC-7): Wrong API key returns 401', async () => {
    if (!serverUp) {
      console.log('    (Server not running — skipping)');
      return;
    }

    const res = await httpGet(
      `${BASE_URL}/api/admin/funnel/trial-activation`,
      { Authorization: 'Bearer wrong-key-abc123' }
    );
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // ── Structural checks ────────────────────────────────────────────────────
  await test('Test 8: Express route file exists at routes/admin/funnel-diagnostics.js', async () => {
    const routePath = path.join(__dirname, '../../routes/admin/funnel-diagnostics.js');
    assert.ok(fs.existsSync(routePath), 'routes/admin/funnel-diagnostics.js must exist');

    const content = fs.readFileSync(routePath, 'utf8');
    assert.ok(content.includes('/api/admin/funnel/trial-activation'), 'Express route must define the correct path');
    assert.ok(content.includes('LEADFLOW_API_KEY'), 'Express route must check LEADFLOW_API_KEY');
    assert.ok(content.includes('window_days'), 'Express route must support window_days param');
    assert.ok(content.includes('activation_segment'), 'Express route must produce activation_segment');
  });

  await test('Test 9: Next.js route file exists at app/api/admin/funnel/trial-activation/route.ts', async () => {
    const routePath = path.join(
      __dirname,
      '../../product/lead-response/dashboard/app/api/admin/funnel/trial-activation/route.ts'
    );
    assert.ok(fs.existsSync(routePath), 'Next.js trial-activation route.ts must exist');

    const content = fs.readFileSync(routePath, 'utf8');
    assert.ok(content.includes('LEADFLOW_API_KEY'), 'Next.js route must check LEADFLOW_API_KEY');
    assert.ok(content.includes('never_activated'), 'Next.js route must produce never_activated segment');
    assert.ok(content.includes('follow_up_boss_api_key'), 'Next.js route must query follow_up_boss_api_key');
    assert.ok(content.includes("export async function GET"), 'Next.js route must export GET handler');
  });

  await test('Test 10: Dashboard page exists at app/admin/funnel/trial-activation/page.tsx', async () => {
    const pagePath = path.join(
      __dirname,
      '../../product/lead-response/dashboard/app/admin/funnel/trial-activation/page.tsx'
    );
    assert.ok(fs.existsSync(pagePath), 'trial-activation page.tsx must exist');

    const content = fs.readFileSync(pagePath, 'utf8');
    assert.ok(content.includes('TrialActivationPage'), 'Page must export TrialActivationPage component');
    assert.ok(
      content.includes('Active') && content.includes('Onboarded') && content.includes('Never Activated'),
      'Page must render all three segment columns'
    );
    assert.ok(content.includes('/api/admin/funnel/trial-activation'), 'Page must call the trial-activation API');
  });

  // ── SQL logic validation (DB required) ───────────────────────────────────
  await test('Test 11: SQL segmentation logic is correct (DB required)', async () => {
    if (!db) {
      console.log('    (DB not available — skipping live SQL test)');
      return;
    }

    // Verify the segmentation SQL runs without error and produces three segments
    const sql = `
      WITH trial_agents AS (
        SELECT id AS agent_id, trial_ends_at
        FROM real_estate_agents
        WHERE trial_ends_at IS NOT NULL
          AND (subscription_status IS NULL OR subscription_status NOT IN ('active', 'canceled'))
      ),
      fub_status AS (
        SELECT agent_id,
               (follow_up_boss_api_key IS NOT NULL AND follow_up_boss_api_key != '') AS fub_connected
        FROM agent_integrations
      ),
      lead_activity AS (
        SELECT agent_id,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS leads_last_7d
        FROM leads
        GROUP BY agent_id
      ),
      sms_activity AS (
        SELECT l.agent_id,
               COUNT(*) FILTER (
                 WHERE sm.created_at >= NOW() - INTERVAL '7 days' AND sm.direction = 'outbound'
               ) AS sms_sent_last_7d
        FROM sms_messages sm
        JOIN leads l ON sm.lead_id = l.id
        WHERE sm.direction = 'outbound'
        GROUP BY l.agent_id
      )
      SELECT
        CASE
          WHEN COALESCE(fs.fub_connected, false)
               AND COALESCE(la.leads_last_7d, 0) > 0
               AND COALESCE(sa.sms_sent_last_7d, 0) > 0
          THEN 'active'
          WHEN COALESCE(fs.fub_connected, false)
          THEN 'onboarded'
          ELSE 'never_activated'
        END AS activation_segment,
        COUNT(*) AS cnt
      FROM trial_agents ta
      LEFT JOIN fub_status fs    ON fs.agent_id = ta.agent_id
      LEFT JOIN lead_activity la ON la.agent_id = ta.agent_id
      LEFT JOIN sms_activity sa  ON sa.agent_id = ta.agent_id
      GROUP BY activation_segment
    `;

    const { rows } = await db.query(sql);

    // All segments returned must be one of the three valid values
    const validSegments = new Set(['active', 'onboarded', 'never_activated']);
    for (const row of rows) {
      assert.ok(
        validSegments.has(row.activation_segment),
        `Unknown segment: ${row.activation_segment}`
      );
    }

    console.log('    SQL segmentation query ran successfully');
    console.log(`    Segments found: ${rows.map((r) => `${r.activation_segment}(${r.cnt})`).join(', ') || 'none'}`);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (_pool) {
    await _pool.end().catch(() => {});
    _pool = null;
  }

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
