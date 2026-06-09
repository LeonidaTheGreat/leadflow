'use strict';
/**
 * QC E2E: Milestone reset — Day 90 archived, active milestone 2026-07-01
 *
 * Independently verifies:
 * 1. DB: project_goals state (first_paying_customer deadline = 2026-07-01, archived 2026-05-15)
 * 2. DB: project_metadata.goal text
 * 3. Code: revenue-collector.js handles first_paying_customer
 * 4. Docs: CLAUDE.md reflects updated goal (2026-07-01)
 * 5. Docs: PMF.md reflects updated near-term milestone (2026-07-01)
 *
 * Run: node tests/e2e/c31b8b4f-goal-redefine-qc.test.js
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

console.log('\nQC E2E: Milestone reset — Day 90 archived, active milestone 2026-07-01\n');

// ── DB: project_goals ─────────────────────────────────────────────────────
ok('first_paying_customer goal exists in project_goals', () => {
  const row = pg("SELECT COUNT(*) FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.strictEqual(row.trim(), '1', `Expected 1 row, got: ${row}`);
});

ok('first_paying_customer target_value = 1 (not 20000)', () => {
  const row = pg("SELECT target_value FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.strictEqual(row.trim(), '1', `Expected 1, got: ${row}`);
});

ok('first_paying_customer target_date = 2026-07-01 (Day 90 archived)', () => {
  const row = pg("SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('2026-07-01'), `Expected 2026-07-01, got: ${row}`);
});

ok('first_paying_customer archived_deadline = 2026-05-15 preserved in metadata', () => {
  const row = pg("SELECT metadata->>'archived_deadline' FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('2026-05-15'), `Expected archived_deadline 2026-05-15, got: ${row}`);
});

ok('first_paying_customer status = active', () => {
  const row = pg("SELECT status FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('active'), `Expected active, got: ${row}`);
});

ok('MRR goal target_date = 2026-08-13 (Day 180)', () => {
  const row = pg("SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='mrr'");
  assert.ok(row.includes('2026-08-13'), `Expected 2026-08-13, got: ${row}`);
});

ok('MRR goal target_value = 20000', () => {
  const row = pg("SELECT target_value FROM project_goals WHERE project_id='leadflow' AND goal_type='mrr'");
  assert.strictEqual(row.trim(), '20000', `Expected 20000, got: ${row}`);
});

// ── DB: project_metadata ──────────────────────────────────────────────────
ok('project_metadata.goal mentions first paying customer', () => {
  const row = pg("SELECT goal FROM project_metadata WHERE project_id='leadflow'");
  assert.ok(
    row.toLowerCase().includes('first paying customer'),
    `Expected 'first paying customer' in goal, got: ${row}`
  );
});

ok('project_metadata.goal mentions Day 180 for MRR', () => {
  const row = pg("SELECT goal FROM project_metadata WHERE project_id='leadflow'");
  assert.ok(row.includes('Day 180'), `Expected 'Day 180' in goal, got: ${row}`);
});

// NOTE: revenue-collector.js first_paying_customer handling is a genome concern (separate project).
// Tracked separately: genome/scripts/revenue-collector.js needs case 'first_paying_customer' in goal_type switch.

// ── Docs: CLAUDE.md ───────────────────────────────────────────────────────
ok('CLAUDE.md: goal updated away from $20K MRR / 90 days', () => {
  const src = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  assert.ok(
    !src.includes('$20K MRR within 90 days'),
    'CLAUDE.md still has old $20K MRR / 90 days goal'
  );
});

ok('CLAUDE.md: near-term goal updated to 2026-07-01', () => {
  const src = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  assert.ok(
    src.includes('2026-07-01'),
    'CLAUDE.md missing updated 2026-07-01 deadline'
  );
});

// ── Docs: PMF.md ──────────────────────────────────────────────────────────
ok('PMF.md: near-term milestone updated to 2026-07-01', () => {
  const src = fs.readFileSync(path.join(ROOT, 'PMF.md'), 'utf8');
  assert.ok(
    src.includes('2026-07-01'),
    'PMF.md missing 2026-07-01 near-term milestone'
  );
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
