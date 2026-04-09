/**
 * Fix: trial_start_date is NULL on every new signup
 * Task ID: 74f7576a-af0a-4de9-8998-a1ac7fe78740
 *
 * Verifies that:
 * 1. trial-signup route sets trial_start_date on INSERT
 * 2. trial/start route sets trial_start_date on INSERT
 * 3. No existing trial accounts have NULL trial_start_date (backfill verification)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASH = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard');
const TRIAL_SIGNUP_ROUTE = path.join(DASH, 'app', 'api', 'auth', 'trial-signup', 'route.ts');
const TRIAL_START_ROUTE = path.join(DASH, 'app', 'api', 'trial', 'start', 'route.ts');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

// ─── Source code checks ───────────────────────────────────────────────────────

test('trial-signup route sets trial_start_date in INSERT', () => {
  const src = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8');
  assert.ok(src.includes('trial_start_date'), 'trial_start_date not found in trial-signup route');
  // Ensure it's in the insert block (not just a comment)
  const insertMatch = src.match(/\.insert\(\{[\s\S]+?\}\)/);
  assert.ok(insertMatch, 'No .insert() block found');
  assert.ok(insertMatch[0].includes('trial_start_date'), 'trial_start_date not in INSERT payload');
});

test('trial/start route sets trial_start_date in INSERT', () => {
  const src = fs.readFileSync(TRIAL_START_ROUTE, 'utf8');
  assert.ok(src.includes('trial_start_date'), 'trial_start_date not found in trial/start route');
  const insertMatch = src.match(/\.insert\(\{[\s\S]+?\}\)/);
  assert.ok(insertMatch, 'No .insert() block found');
  assert.ok(insertMatch[0].includes('trial_start_date'), 'trial_start_date not in INSERT payload');
});

test('trial-signup route sets trial_start_date to current time (now variable)', () => {
  const src = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8');
  // Should assign trial_start_date with now or new Date()
  assert.ok(
    src.includes('trial_start_date: now') || src.includes('trial_start_date: new Date'),
    'trial_start_date should be set to current time (now or new Date())'
  );
});

test('trial/start route sets trial_start_date to current time', () => {
  const src = fs.readFileSync(TRIAL_START_ROUTE, 'utf8');
  assert.ok(
    src.includes('trial_start_date: new Date') || src.includes('trial_start_date: now'),
    'trial_start_date should be set to current time'
  );
});

// ─── Database backfill verification ──────────────────────────────────────────

asyncTest('no trial accounts have NULL trial_start_date after backfill', async () => {
  const { Client } = require('pg');
  const dbUrl = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const res = await client.query(
      "SELECT COUNT(*) as cnt FROM real_estate_agents WHERE plan_tier = 'trial' AND trial_start_date IS NULL"
    );
    const nullCount = parseInt(res.rows[0].cnt, 10);
    assert.strictEqual(nullCount, 0, `${nullCount} trial accounts still have NULL trial_start_date`);
  } finally {
    await client.end();
  }
});

asyncTest('trial_start_date backfill used created_at (no future dates)', async () => {
  const { Client } = require('pg');
  const dbUrl = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const res = await client.query(
      "SELECT COUNT(*) as cnt FROM real_estate_agents WHERE plan_tier = 'trial' AND trial_start_date > NOW()"
    );
    const futureCount = parseInt(res.rows[0].cnt, 10);
    assert.strictEqual(futureCount, 0, `${futureCount} trial accounts have trial_start_date in the future`);
  } finally {
    await client.end();
  }
});

// ─── Results ──────────────────────────────────────────────────────────────────

Promise.resolve().then(() => {
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
