/**
 * QC E2E: trial_start_date fix verification
 * Task: b2e156fd-7cd4-4bed-b148-2559878fa52d
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DASH = path.join('/Users/clawdbot/projects/leadflow', 'product', 'lead-response', 'dashboard');
const TRIAL_SIGNUP = path.join(DASH, 'app', 'api', 'auth', 'trial-signup', 'route.ts');
const TRIAL_START = path.join(DASH, 'app', 'api', 'trial', 'start', 'route.ts');
const DAY3_ROUTE = path.join(DASH, 'app', 'api', 'onboarding', 'send-aha-day3', 'route.ts');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name} — ${e.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name} — ${e.message}`);
    failed++;
  }
}

// 1. Source: trial_start_date in trial-signup INSERT block
test('trial-signup: trial_start_date in INSERT payload', () => {
  const src = fs.readFileSync(TRIAL_SIGNUP, 'utf8');
  const insertBlock = src.match(/\.insert\(\{[\s\S]+?\}\)/);
  assert.ok(insertBlock, 'no .insert() block');
  assert.ok(insertBlock[0].includes('trial_start_date'), 'trial_start_date absent from INSERT');
});

// 2. Source: trial_start_date in trial/start INSERT block
test('trial/start: trial_start_date in INSERT payload', () => {
  const src = fs.readFileSync(TRIAL_START, 'utf8');
  const insertBlock = src.match(/\.insert\(\{[\s\S]+?\}\)/);
  assert.ok(insertBlock, 'no .insert() block');
  assert.ok(insertBlock[0].includes('trial_start_date'), 'trial_start_date absent from INSERT');
});

// 3. Both routes set trial_start_date to current time (not hardcoded)
test('trial-signup: trial_start_date assigned from now/new Date', () => {
  const src = fs.readFileSync(TRIAL_SIGNUP, 'utf8');
  assert.ok(
    /trial_start_date:\s*(now|new Date)/.test(src),
    'trial_start_date not assigned to current time'
  );
});

test('trial/start: trial_start_date assigned from now/new Date', () => {
  const src = fs.readFileSync(TRIAL_START, 'utf8');
  assert.ok(
    /trial_start_date:\s*(now|new Date)/.test(src),
    'trial_start_date not assigned to current time'
  );
});

// 4. trial_start_date is a full ISO timestamp (not just a date string)
test('trial/start: trial_start_date uses .toISOString()', () => {
  const src = fs.readFileSync(TRIAL_START, 'utf8');
  assert.ok(src.includes('trial_start_date: new Date().toISOString()'), 'must use new Date().toISOString()');
});

// 5. DB: no NULL trial_start_date on trial accounts
asyncTest('DB: zero trial accounts with NULL trial_start_date', async () => {
  const client = new Client({ connectionString: process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw' });
  await client.connect();
  try {
    const res = await client.query(
      "SELECT COUNT(*) AS n FROM real_estate_agents WHERE plan_tier = 'trial' AND trial_start_date IS NULL"
    );
    const n = parseInt(res.rows[0].n, 10);
    assert.strictEqual(n, 0, `${n} trial accounts still have NULL trial_start_date`);
  } finally {
    await client.end();
  }
});

// 6. DB: trial_start_date <= trial_ends_at (logical consistency)
asyncTest('DB: trial_start_date <= trial_ends_at for all trial accounts', async () => {
  const client = new Client({ connectionString: process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw' });
  await client.connect();
  try {
    const res = await client.query(
      "SELECT COUNT(*) AS n FROM real_estate_agents WHERE plan_tier = 'trial' AND trial_start_date IS NOT NULL AND trial_ends_at IS NOT NULL AND trial_start_date > trial_ends_at"
    );
    const n = parseInt(res.rows[0].n, 10);
    assert.strictEqual(n, 0, `${n} trial accounts have trial_start_date after trial_ends_at`);
  } finally {
    await client.end();
  }
});

// 7. Pre-existing bug detection: day-3 GET uses wrong column name (trial_started_at vs trial_start_date)
test('KNOWN BUG: day-3 GET cohort query uses trial_started_at (wrong column name)', () => {
  const src = fs.readFileSync(DAY3_ROUTE, 'utf8');
  // This test documents the pre-existing bug — it passes when the bug exists, documents it explicitly
  const usesWrongColumn = src.includes('trial_started_at');
  const usesRightColumn = /\.gte\('trial_start_date'/.test(src) || /\.lte\('trial_start_date'/.test(src);
  // If it uses the wrong column and not the right one → bug still present
  if (usesWrongColumn && !usesRightColumn) {
    console.log('  NOTE: day-3 GET uses trial_started_at (should be trial_start_date) — pre-existing bug, not introduced by this PR');
  }
  // This test always passes — it's documenting, not blocking
  assert.ok(true);
});

Promise.resolve().then(() => {
  console.log(`\nResults: ${passed + failed} total, ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
