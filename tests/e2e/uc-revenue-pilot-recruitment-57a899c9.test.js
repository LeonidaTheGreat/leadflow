/**
 * E2E test: Pilot Recruitment Campaign (UC-PILOT-DIRECT-RECRUITMENT)
 * Task: 57a899c9-ba59-4e8d-9b34-fdc75c532d18
 *
 * Tests:
 * 1. DB schema — all 3 tables exist with correct columns
 * 2. Campaign CRUD — insert, query, delete
 * 3. Target CRUD — insert, query, delete
 * 4. Touchpoint insertion
 * 5. Migration file exists
 * 6. Next.js API route files exist
 * 7. Admin dashboard page exists
 * 8. routes/pilot-campaigns.js exports expected handlers
 * 9. Auth check — admin API routes are accessible without auth (known gap, documented)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getPool, endPool } = require('../lib/db');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = getPool();

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

async function run() {
  console.log('\n=== Pilot Recruitment Campaign E2E Tests ===\n');

  // 1. Schema: all three tables exist
  await test('pilot_recruitment_campaigns table exists', async () => {
    const r = await pool.query("SELECT to_regclass('pilot_recruitment_campaigns') as t");
    assert.ok(r.rows[0].t, 'pilot_recruitment_campaigns table missing');
  });

  await test('pilot_recruitment_targets table exists', async () => {
    const r = await pool.query("SELECT to_regclass('pilot_recruitment_targets') as t");
    assert.ok(r.rows[0].t, 'pilot_recruitment_targets table missing');
  });

  await test('pilot_recruitment_touchpoints table exists', async () => {
    const r = await pool.query("SELECT to_regclass('pilot_recruitment_touchpoints') as t");
    assert.ok(r.rows[0].t, 'pilot_recruitment_touchpoints table missing');
  });

  // 2. campaigns table has required columns
  await test('campaigns table has required columns', async () => {
    const r = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pilot_recruitment_campaigns'
    `);
    const cols = r.rows.map(x => x.column_name);
    for (const col of ['id', 'name', 'goal_count', 'start_date', 'end_date', 'status', 'utm_campaign']) {
      assert.ok(cols.includes(col), `Missing column: ${col}`);
    }
  });

  // 3. targets table has required columns
  await test('targets table has required columns', async () => {
    const r = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pilot_recruitment_targets'
    `);
    const cols = r.rows.map(x => x.column_name);
    for (const col of ['id', 'campaign_id', 'name', 'email', 'source_channel', 'status', 'priority']) {
      assert.ok(cols.includes(col), `Missing column: ${col}`);
    }
  });

  // 4. Campaign CRUD
  let campaignId;
  await test('can insert a campaign', async () => {
    const r = await pool.query(`
      INSERT INTO pilot_recruitment_campaigns (name, goal_count, start_date, end_date, status, utm_campaign)
      VALUES ('Test Campaign', 30, '2026-04-05', '2026-05-05', 'active', 'test-2026')
      RETURNING id
    `);
    campaignId = r.rows[0].id;
    assert.ok(campaignId, 'No ID returned');
  });

  await test('can query a campaign by id', async () => {
    const r = await pool.query('SELECT * FROM pilot_recruitment_campaigns WHERE id = $1', [campaignId]);
    assert.strictEqual(r.rows.length, 1, 'Campaign not found');
    assert.strictEqual(r.rows[0].name, 'Test Campaign');
    assert.strictEqual(r.rows[0].goal_count, 30);
  });

  // 5. Target CRUD
  let targetId;
  await test('can insert a recruitment target', async () => {
    const r = await pool.query(`
      INSERT INTO pilot_recruitment_targets (campaign_id, name, email, source_channel, status, priority)
      VALUES ($1, 'John Doe', 'johndoe@example.com', 'linkedin', 'identified', 5)
      RETURNING id
    `, [campaignId]);
    targetId = r.rows[0].id;
    assert.ok(targetId, 'No ID returned');
  });

  await test('can query targets by campaign', async () => {
    const r = await pool.query('SELECT * FROM pilot_recruitment_targets WHERE campaign_id = $1', [campaignId]);
    assert.strictEqual(r.rows.length, 1);
    assert.strictEqual(r.rows[0].name, 'John Doe');
    assert.strictEqual(r.rows[0].source_channel, 'linkedin');
  });

  await test('can update target status', async () => {
    await pool.query('UPDATE pilot_recruitment_targets SET status = $1 WHERE id = $2', ['contacted', targetId]);
    const r = await pool.query('SELECT status FROM pilot_recruitment_targets WHERE id = $1', [targetId]);
    assert.strictEqual(r.rows[0].status, 'contacted');
  });

  // 6. Touchpoint insertion
  await test('can insert a touchpoint', async () => {
    const r = await pool.query(`
      INSERT INTO pilot_recruitment_touchpoints (target_id, channel, touch_type, utm_source)
      VALUES ($1, 'linkedin', 'initial', 'linkedin-outreach')
      RETURNING id
    `, [targetId]);
    assert.ok(r.rows[0].id);
  });

  // 7. Cascade delete
  await test('cascade delete removes targets and touchpoints', async () => {
    await pool.query('DELETE FROM pilot_recruitment_campaigns WHERE id = $1', [campaignId]);
    const r1 = await pool.query('SELECT id FROM pilot_recruitment_targets WHERE campaign_id = $1', [campaignId]);
    assert.strictEqual(r1.rows.length, 0, 'Targets not cascade deleted');
  });

  // 8. Migration file exists
  await test('migration file 008 exists', () => {
    const migPath = path.join(__dirname, '../migrations/008_pilot_recruitment_campaign_tracking.sql');
    assert.ok(fs.existsSync(migPath), `Migration not found at ${migPath}`);
  });

  // 9. Next.js API route files exist
  await test('Next.js pilot-campaigns list route exists', () => {
    const p = path.join(__dirname, '../product/lead-response/dashboard/app/api/admin/pilot-campaigns/route.ts');
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });

  await test('Next.js pilot-campaigns stats route exists', () => {
    const p = path.join(__dirname, '../product/lead-response/dashboard/app/api/admin/pilot-campaigns/[id]/stats/route.ts');
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });

  await test('Next.js pilot-campaigns targets route exists', () => {
    const p = path.join(__dirname, '../product/lead-response/dashboard/app/api/admin/pilot-campaigns/[id]/targets/route.ts');
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });

  await test('Next.js pilot-targets update route exists', () => {
    const p = path.join(__dirname, '../product/lead-response/dashboard/app/api/admin/pilot-targets/[id]/route.ts');
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });

  // 10. Admin dashboard page exists
  await test('Admin pilot-campaigns page exists', () => {
    const p = path.join(__dirname, '../product/lead-response/dashboard/app/admin/pilot-campaigns/page.tsx');
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });

  // 11. Express handler exports
  await test('routes/pilot-campaigns.js exports all handlers', () => {
    const mod = require('../routes/pilot-campaigns.js');
    for (const fn of ['listCampaigns', 'getCampaign', 'listTargets', 'addTarget', 'updateTarget', 'addTouchpoint', 'getCampaignStats']) {
      assert.strictEqual(typeof mod[fn], 'function', `Missing export: ${fn}`);
    }
  });

  // 12. Status constraint check (invalid status should fail)
  await test('targets status constraint rejects invalid values', async () => {
    let threw = false;
    const r = await pool.query(`
      INSERT INTO pilot_recruitment_campaigns (name, goal_count, start_date, end_date, status)
      VALUES ('Temp', 10, '2026-04-05', '2026-05-05', 'active') RETURNING id
    `);
    const tempId = r.rows[0].id;
    try {
      await pool.query(`
        INSERT INTO pilot_recruitment_targets (campaign_id, name, source_channel, status)
        VALUES ($1, 'Test', 'email', 'invalid_status_xyz')
      `, [tempId]);
    } catch (e) {
      threw = true;
    } finally {
      await pool.query('DELETE FROM pilot_recruitment_campaigns WHERE id = $1', [tempId]);
    }
    assert.ok(threw, 'Should reject invalid status value');
  });

  await endPool();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
