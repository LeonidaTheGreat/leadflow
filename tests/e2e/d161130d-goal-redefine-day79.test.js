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

console.log('\nE2E: Milestone reset — Day 90 archived, active milestone 2026-07-01\n');

// --- DB: project_goals ---
ok('first_paying_customer goal exists and is active', () => {
  const row = pg("SELECT status FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('active'), `Expected 'active', got: ${row}`);
});

ok('first_paying_customer target_date = 2026-07-01 (updated from Day 90)', () => {
  const row = pg("SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('2026-07-01'), `Expected 2026-07-01, got: ${row}`);
});

ok('first_paying_customer archived_deadline preserved in metadata', () => {
  const row = pg("SELECT metadata->>'archived_deadline' FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.ok(row.includes('2026-05-15'), `Expected archived_deadline 2026-05-15, got: ${row}`);
});

ok('first_paying_customer target_value = 1', () => {
  const row = pg("SELECT target_value FROM project_goals WHERE project_id='leadflow' AND goal_type='first_paying_customer'");
  assert.strictEqual(row.trim(), '1', `Expected 1, got: ${row}`);
});

ok('MRR goal target_date = 2026-08-13 (Day 180)', () => {
  const row = pg("SELECT target_date FROM project_goals WHERE project_id='leadflow' AND goal_type='mrr'");
  assert.ok(row.includes('2026-08-13'), `Expected 2026-08-13, got: ${row}`);
});

ok('MRR goal target_value = 20000', () => {
  const row = pg("SELECT target_value FROM project_goals WHERE project_id='leadflow' AND goal_type='mrr'");
  assert.strictEqual(row.trim(), '20000', `Expected 20000, got: ${row}`);
});

// --- DB: project_missions ---
ok('project_missions milestones contain 2026-07-01 active milestone', () => {
  const row = pg("SELECT milestones FROM project_missions WHERE project_id='leadflow'");
  assert.ok(row.includes('2026-07-01'), `Missing 2026-07-01 milestone: ${row}`);
  assert.ok(row.includes('in_progress'), `Missing in_progress status: ${row}`);
});

// --- DB: mission_metrics ---
ok('mission_metrics has First Paying Customer metric (target=1, deadline 2026-07-01)', () => {
  const row = pg("SELECT description FROM mission_metrics WHERE project_id='leadflow' AND name='First Paying Customer'");
  assert.ok(row.includes('2026-07-01'), `Missing 2026-07-01 in description: ${row}`);
});

// --- project.config.json ---
ok('project.config.json active_milestone_deadline = 2026-07-01', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'));
  assert.strictEqual(cfg.reporting.active_milestone_deadline, '2026-07-01', `Expected 2026-07-01, got: ${cfg.reporting.active_milestone_deadline}`);
});

ok('project.config.json day_target = 180', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'));
  assert.strictEqual(cfg.reporting.day_target, 180, `Expected 180, got: ${cfg.reporting.day_target}`);
});

ok('project.config.json archived_milestones contains Day 90 as missed', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'));
  const archived = cfg.reporting.archived_milestones || [];
  const day90 = archived.find(m => m.deadline === '2026-05-15');
  assert.ok(day90, 'Missing Day 90 archived milestone');
  assert.strictEqual(day90.status, 'missed', `Expected status=missed, got: ${day90.status}`);
});

// --- Docs: PMF.md ---
ok('PMF.md near-term milestone updated to 2026-07-01', () => {
  const src = fs.readFileSync(path.join(ROOT, 'PMF.md'), 'utf8');
  assert.ok(src.includes('2026-07-01'), 'PMF.md missing 2026-07-01 milestone');
  assert.ok(src.includes('2026-08-13'), 'PMF.md missing Day 180 date');
});

// --- Docs: CLAUDE.md ---
ok('CLAUDE.md near-term goal updated to 2026-07-01', () => {
  const src = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  assert.ok(src.includes('2026-07-01'), 'CLAUDE.md missing 2026-07-01 deadline');
  assert.ok(src.includes('Day 180'), 'CLAUDE.md missing Day 180 reference');
});

// NOTE: revenue-collector.js first_paying_customer handling is a genome concern.
// Tracked separately: genome/scripts/revenue-collector.js needs case 'first_paying_customer' in goal_type switch.

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
