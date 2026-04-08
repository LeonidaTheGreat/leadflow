'use strict';
/**
 * QC E2E: Task c31b8b4f — Day 79 goal redefinition
 *
 * Independently verifies:
 * 1. DB: project_goals state (first_paying_customer + MRR deferred)
 * 2. DB: project_metadata.goal text
 * 3. Code: revenue-collector.js handles first_paying_customer
 * 4. Docs: CLAUDE.md reflects updated goal
 * 5. Docs: PMF.md reflects updated near-term milestone
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

console.log('\nQC E2E: Task c31b8b4f — Day 79 goal redefinition\n');

// ── DB: project_goals ─────────────────────────────────────────────────────
ok('first_paying_customer goal exists in project_goals', () => {
  const row = pg("SELECT COUNT(*) FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.strictEqual(row.trim(), '1', `Expected 1 row, got: ${row}`);
});

ok('first_paying_customer target_value = 1 (not 20000)', () => {
  const row = pg("SELECT target_value FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.strictEqual(row.trim(), '1', `Expected 1, got: ${row}`);
});

ok('first_paying_customer target_date = 2026-05-15', () => {
  const row = pg("SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('2026-05-15'), `Expected 2026-05-15, got: ${row}`);
});

ok('first_paying_customer status = active', () => {
  const row = pg("SELECT status FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('active'), `Expected active, got: ${row}`);
});

ok('MRR goal target_date deferred to 2026-08-13', () => {
  const row = pg("SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='mrr'");
  assert.ok(row.includes('2026-08-13'), `Expected 2026-08-13, got: ${row}`);
});

ok('MRR goal target_value remains 20000', () => {
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

// ── Code: revenue-collector ────────────────────────────────────────────────
ok('revenue-collector.js has first_paying_customer case', () => {
  const rcPath = `${process.env.HOME}/.openclaw/genome/scripts/revenue-collector.js`;
  assert.ok(fs.existsSync(rcPath), `revenue-collector.js not found at ${rcPath}`);
  const src = fs.readFileSync(rcPath, 'utf8');
  assert.ok(src.includes("case 'first_paying_customer':"), 'Missing case first_paying_customer');
});

ok('revenue-collector first_paying_customer checks active_subscribers', () => {
  const rcPath = `${process.env.HOME}/.openclaw/genome/scripts/revenue-collector.js`;
  const src = fs.readFileSync(rcPath, 'utf8');
  assert.ok(
    src.includes('active_subscribers > 0 ? 1 : 0'),
    'Missing active_subscribers check in first_paying_customer case'
  );
});

// ── Docs: CLAUDE.md ───────────────────────────────────────────────────────
ok('CLAUDE.md: goal updated away from $20K MRR / 90 days', () => {
  const src = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  // Should no longer be the old goal
  assert.ok(
    !src.includes('$20K MRR within 90 days'),
    'CLAUDE.md still has old $20K MRR / 90 days goal'
  );
});

ok('CLAUDE.md: contains first paying customer goal', () => {
  const src = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  assert.ok(
    src.toLowerCase().includes('first paying customer'),
    'CLAUDE.md missing updated first paying customer goal'
  );
});

// ── Docs: PMF.md ──────────────────────────────────────────────────────────
ok('PMF.md: contains near-term milestone for Day 90', () => {
  const src = fs.readFileSync(path.join(ROOT, 'PMF.md'), 'utf8');
  assert.ok(
    src.includes('Day 90') || src.includes('2026-05-15') || src.includes('first paying customer'),
    'PMF.md missing Day 90 near-term milestone'
  );
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
