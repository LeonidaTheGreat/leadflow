/**
 * E2E Test: QC Dispatch for awaiting_merge Tasks
 * Task ID: 995e3054-262b-4c7a-ad6f-768f5bee8b78
 *
 * Validates that the QC backfill (checkPRReviews in pr-review-loop.js) correctly
 * creates and dispatches QC tasks for pending code_reviews.
 *
 * Root cause fixed (genome dev/2eb6252b-...):
 *   findLatestTaskByTitle was called without projectId in the QC backfill dedup check.
 *   The store.projectId is set at construction time and NOT updated when setRuntime()
 *   switches projects in the heartbeat loop. When the heartbeat ran for the genome
 *   project, the dedup check used store.projectId (leadflow) and found leadflow QC
 *   tasks — silently blocking genome QC task creation. Cross-project collisions on
 *   PR numbers (same PR # exists in both projects) made this non-obvious.
 *
 * Fix: pass this.projectId explicitly to findLatestTaskByTitle in QC backfill.
 *
 * Additional improvements (genome dev/fix-qc-dispatch-model-and-concurrency):
 *   - QC backfill model changed from 'codex' to 'sonnet' (codex zombies on large projects)
 *   - QC concurrency raised from 1 to 2 to drain backlogs faster
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

const tests = [];
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧪 E2E Test: QC Dispatch for awaiting_merge Tasks\n');

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✅ PASS: ${t.name}`);
      passCount++;
    } catch (err) {
      console.log(`❌ FAIL: ${t.name}`);
      console.log(`   Error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed out of ${passCount + failCount} total\n`);
  if (failCount > 0) process.exit(1);
}

// ── Test 1: Primary fix — dedup uses this.projectId ─────────────────────────

test('QC backfill dedup passes projectId to findLatestTaskByTitle (primary fix)', () => {
  const prReviewPath = path.join(
    require('os').homedir(),
    'projects/genome/core/loops/pr-review-loop.js'
  );

  assert.ok(
    fs.existsSync(prReviewPath),
    `pr-review-loop.js not found at ${prReviewPath}`
  );

  const content = fs.readFileSync(prReviewPath, 'utf-8');

  // The QC backfill must pass this.projectId to findLatestTaskByTitle
  // Without this, cross-project PR number collisions silently block QC creation
  assert.ok(
    content.includes('findLatestTaskByTitle(qcTitle, this.projectId)'),
    'QC backfill dedup must pass this.projectId to findLatestTaskByTitle — ' +
    'without this, cross-project PR collisions silently block QC task creation'
  );
});

// ── Test 2: QC backfill limit is at least 5 per heartbeat ───────────────────

test('QC backfill processes at least 5 pending reviews per heartbeat', () => {
  const prReviewPath = path.join(
    require('os').homedir(),
    'projects/genome/core/loops/pr-review-loop.js'
  );
  const content = fs.readFileSync(prReviewPath, 'utf-8');

  // QC_BACKFILL_LIMIT >= 5 ensures 15-task backlogs drain within 3 heartbeats (90 min)
  const match = content.match(/QC_BACKFILL_LIMIT\s*=\s*(\d+)/);
  assert.ok(match, 'QC_BACKFILL_LIMIT constant not found in pr-review-loop.js');

  const limit = parseInt(match[1]);
  assert.ok(
    limit >= 5,
    `QC_BACKFILL_LIMIT is ${limit} — must be ≥5 to drain 15-task backlogs within 3 heartbeats`
  );
});

// ── Test 3: QC dedup uses pr_number to prevent cross-PR blocking ─────────────

test('createTask dedup includes pr_number for QC agent to prevent cross-PR blocking', () => {
  const taskStorePath = path.join(
    require('os').homedir(),
    'projects/genome/core/task-store-base.js'
  );

  assert.ok(fs.existsSync(taskStorePath), `task-store-base.js not found at ${taskStorePath}`);
  const content = fs.readFileSync(taskStorePath, 'utf-8');

  // The createTask UC dedup for QC must include pr_number filter
  // Without this, one stale QC task on uc-*-maintenance blocks all new QC tasks
  assert.ok(
    content.includes("normalizedAgent === 'qc' && task.pr_number"),
    "createTask dedup must filter by pr_number for QC agent to prevent one stale task " +
    "blocking all new QC tasks on the maintenance UC"
  );
});

// ── Test 4: DB state — pending reviews have QC tasks or have been processed ──

test('DB: pending code_reviews for leadflow have corresponding active QC tasks', async () => {
  const pgUrl = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';
  const pg = new Client({ connectionString: pgUrl });

  try {
    await pg.connect();

    // Get pending reviews
    const pendingRes = await pg.query(`
      SELECT cr.id, cr.pr_number, cr.branch_name, cr.project_id
      FROM code_reviews cr
      WHERE cr.project_id = 'leadflow' AND cr.status = 'pending'
      ORDER BY cr.created_at
    `);
    const pendingReviews = pendingRes.rows;

    if (pendingReviews.length === 0) {
      console.log('   (no pending leadflow reviews — all processed)');
      return; // Pass: backlog is empty
    }

    // For each pending review, there should be an active QC task or a completed one
    const prNumbers = pendingReviews.map(r => r.pr_number).filter(Boolean);
    const qcRes = await pg.query(`
      SELECT title, status, pr_number
      FROM tasks
      WHERE agent_id = 'qc'
      AND project_id = 'leadflow'
      AND pr_number = ANY($1::int[])
      AND status NOT IN ('failed', 'cancelled')
    `, [prNumbers]);

    const coveredPRs = new Set(qcRes.rows.map(r => r.pr_number));
    const uncovered = prNumbers.filter(pr => !coveredPRs.has(pr));

    // Allow at most 2 uncovered (may be in the next backfill cycle)
    assert.ok(
      uncovered.length <= 2,
      `${uncovered.length} pending reviews have no active QC task: PRs ${uncovered.join(', ')}. ` +
      `Backfill should have created QC tasks. Check pr-review-loop.js backfill.`
    );

    if (uncovered.length > 0) {
      console.log(`   (${uncovered.length} pending review(s) not yet covered — within tolerance)`);
    }
  } finally {
    await pg.end();
  }
});

// ── Test 5: DB state — no long-running QC starvation ────────────────────────

test('DB: no code_reviews have been pending for more than 2 hours without a QC task', async () => {
  const pgUrl = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';
  const pg = new Client({ connectionString: pgUrl });

  try {
    await pg.connect();

    // Find reviews pending for >2h with no active QC task
    const staleRes = await pg.query(`
      SELECT cr.id, cr.pr_number, cr.project_id, cr.created_at,
             EXTRACT(EPOCH FROM (NOW() - cr.created_at))/3600 as hours_pending
      FROM code_reviews cr
      LEFT JOIN tasks t ON (
        t.agent_id = 'qc'
        AND t.pr_number = cr.pr_number
        AND t.project_id = cr.project_id
        AND t.status NOT IN ('done', 'failed', 'cancelled')
      )
      WHERE cr.status = 'pending'
        AND cr.created_at < NOW() - INTERVAL '2 hours'
        AND t.id IS NULL
      ORDER BY cr.created_at
    `);

    if (staleRes.rows.length > 0) {
      const items = staleRes.rows.map(r =>
        `PR #${r.pr_number} (${r.project_id}, ${parseFloat(r.hours_pending).toFixed(1)}h)`
      ).join(', ');
      assert.fail(
        `${staleRes.rows.length} code_review(s) have been pending >2h with no QC task: ${items}. ` +
        `The QC backfill (checkPRReviews) should have caught these within 30 min.`
      );
    }
  } finally {
    await pg.end();
  }
});

// ── Run ───────────────────────────────────────────────────────────────────────

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
