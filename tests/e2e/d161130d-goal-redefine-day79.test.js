'use strict';
/**
 * E2E test: PR #1052 — Day 79 goal redefinition
 *
 * Verifies DB state + doc consistency for milestone reset.
 * Run: node tests/e2e/d161130d-goal-redefine-day79.test.js
 */

const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_URL = 'postgresql://clawdbot@localhost/openclaw';
const ROOT = path.resolve(__dirname, '../../');

let passed = 0;
let failed = 0;

function pg(sql) {
  return execSync(`psql ${DB_URL} -t -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
}

function ok(label, fn) {
  try {
    fn();
    console.log(`  PASS  ${label}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL  ${label}: ${e.message}`);
    failed++;
  }
}

console.log('\nE2E: PR #1052 — Day 79 goal redefinition\n');

// --- DB: project_goals ---
ok('first_paying_customer goal exists and is active', () => {
  const row = pg("SELECT status FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('active'), `Expected 'active', got: ${row}`);
});

ok('first_paying_customer target_date = 2026-05-15 (Day 90)', () => {
  const row = pg("SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('2026-05-15'), `Expected 2026-05-15, got: ${row}`);
});

ok('first_paying_customer target_value = 1', () => {
  const row = pg("SELECT target_value FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.strictEqual(row.trim(), '1', `Expected 1, got: ${row}`);
});

ok('MRR goal pushed to 2026-08-13 (Day 180)', () => {
  const row = pg("SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='mrr'");
  assert.ok(row.includes('2026-08-13'), `Expected 2026-08-13, got: ${row}`);
});

ok('MRR goal target_value unchanged at 20000', () => {
  const row = pg("SELECT target_value FROM project_goals WHERE project_id='leadflow' AND goal_type='mrr'");
  assert.strictEqual(row.trim(), '20000', `Expected 20000, got: ${row}`);
});

// --- DB: project_metadata ---
ok('project_metadata goal updated to first paying customer + Day 180 MRR', () => {
  const row = pg("SELECT goal FROM project_metadata WHERE project_id='leadflow'");
  assert.ok(row.includes('First paying customer'), `Missing 'First paying customer': ${row}`);
  assert.ok(row.includes('Day 180'), `Missing 'Day 180': ${row}`);
});

// --- Docs: PMF.md ---
ok('PMF.md contains near-term milestone (Day 90)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'PMF.md'), 'utf8');
  assert.ok(src.includes('First paying customer by Day 90'), 'PMF.md missing Day 90 milestone');
  assert.ok(src.includes('2026-08-13'), 'PMF.md missing Day 180 date');
});

// --- Docs: CLAUDE.md ---
ok('CLAUDE.md reflects updated goals', () => {
  const src = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  assert.ok(src.includes('First paying customer by Day 90'), 'CLAUDE.md missing updated near-term goal');
  assert.ok(src.includes('Day 180'), 'CLAUDE.md missing Day 180 reference');
});

// --- revenue-collector handles new goal type ---
ok('revenue-collector.js handles first_paying_customer case', () => {
  const src = fs.readFileSync(`${process.env.HOME}/.openclaw/genome/scripts/revenue-collector.js`, 'utf8');
  assert.ok(src.includes("case 'first_paying_customer':"), 'Missing case in revenue-collector');
  assert.ok(src.includes('active_subscribers > 0 ? 1 : 0'), 'Missing subscriber check in revenue-collector');
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
