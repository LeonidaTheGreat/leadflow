'use strict'
/**
 * Regression tests: 3 dedup bugs in PRReviewLoop.checkPRReviews()
 *
 * Bug 1 (review never closed): fallback path created fix tasks but left review as
 *   changes_requested — on next heartbeat, a new fix task was created once the old one
 *   was done/cancelled, looping forever (confirmed: 7 "Dev Fix: PR #85 rejected..."
 *   tasks created 2026-04-29 to 2026-04-30 for the same parent task 03d9ef8f).
 *   Fix: close review when creating the fix task; use parent_task_id-based dedup.
 *
 * Bug 2 (unexpected task states hit fallback): tasks in cancelled/ready/in_progress
 *   state were not handled by any branch, so they fell through to the else-fallback
 *   and created spurious fix tasks even when the task was already being worked on.
 *   Fix: active/terminal task states close the review without creating a fix task.
 *
 * Bug 3 (awaiting_merge had no retry cap): QC rejection on awaiting_merge tasks
 *   reset the task to ready unconditionally — retryCount was never checked, so a
 *   task could cycle through awaiting_merge → QC rejection → reset → awaiting_merge
 *   forever with no park/stop.
 *   Fix: check retryCount >= maxRetries and park the task when exhausted.
 */

const assert = require('assert')
const path = require('path')

const PR_REVIEW_LOOP_PATH = path.join(process.env.HOME, '.openclaw/genome/core/loops/pr-review-loop.js')
const { PRReviewLoop } = require(PR_REVIEW_LOOP_PATH)

// Minimal query chain that returns empty data for all leaf calls
function makeQueryChain() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    not: () => chain,
    order: () => chain,
    lte: async () => ({ data: [], error: null }),
    ilike: async () => ({ data: [], error: null }),
    in: async () => ({ data: [], error: null }),
    limit: async () => ({ data: [], error: null })
  }
  return chain
}

// Build a PRReviewLoop with a test store
function makeLoop(store) {
  const parent = {
    store,
    actions: [],
    errors: [],
    projectId: 'test-project',
    config: {},
    learner: { recordFailure: () => {}, recordQCFindings: () => {} },
    dryRun: false,
    _dryRunWouldSend: [],
    _mainCIPasses: true,
    _deployedTargets: new Set(),
    executor: { triggerDeployForUC: async () => {}, taskHygiene: null }
  }
  return new PRReviewLoop(parent)
}

// ── Test 1: Bug 1 — fallback creates fix task AND closes review exactly once ──

async function testBug1FallbackClosesReview() {
  const review = {
    id: 'review-no-task',
    pr_number: 202,
    branch_name: 'dev/fix-no-orig-task',
    task_id: null,
    review_notes: { issues: [{ summary: 'Code style issues' }] }
  }

  const calls = { createTask: [], updateCodeReview: [] }
  const store = {
    supabase: {},
    getCodeReviews: async (_pid, filter) =>
      filter?.status === 'changes_requested' ? [review] : [],
    findTaskByTitle: async () => null,
    getTask: async () => null,
    updateTask: async () => {},
    updateCodeReview: async (id, patch) => { calls.updateCodeReview.push({ id, patch }) },
    createTask: async (payload) => { calls.createTask.push(payload); return { id: 'new-task' } },
    query: () => makeQueryChain()
  }

  const loop = makeLoop(store)
  await loop.checkPRReviews()

  assert.strictEqual(calls.createTask.length, 1,
    'must create exactly one fix task in fallback path')
  assert.ok(calls.createTask[0].title.includes('Code style issues'),
    'fix task title must include the QC issue summary')

  // Bug 1 fix: review must be closed so it does not reappear next heartbeat
  const closedCalls = calls.updateCodeReview.filter(
    c => c.id === review.id && c.patch?.status === 'closed'
  )
  assert.strictEqual(closedCalls.length, 1,
    'review must be closed exactly once after creating fix task (Bug 1 fix)')
}

// ── Test 2: Bug 2 — cancelled origTask closes review without fix task ──────────

async function testBug2CancelledTaskClosesReview() {
  const review = {
    id: 'review-cancelled-task',
    pr_number: 85,
    branch_name: 'dev/fix-archived',
    task_id: 'task-cancelled',
    review_notes: {
      rejected_by: 'qc_agent',
      issues: [{ summary: 'PR #85 rejected: incomplete sweep' }]
    }
  }
  const origTask = {
    id: 'task-cancelled', title: 'Fix genome tests',
    status: 'cancelled', retry_count: 3, max_retries: 3
  }

  const calls = { createTask: [], updateCodeReview: [] }
  const store = {
    supabase: {},
    getCodeReviews: async (_pid, filter) =>
      filter?.status === 'changes_requested' ? [review] : [],
    findTaskByTitle: async () => null,
    getTask: async (id) => id === origTask.id ? origTask : null,
    updateTask: async () => {},
    updateCodeReview: async (id, patch) => { calls.updateCodeReview.push({ id, patch }) },
    createTask: async (p) => { calls.createTask.push(p); return { id: 'should-not-create' } },
    query: () => makeQueryChain()
  }

  const loop = makeLoop(store)
  // _findActiveFixTaskForPR returns null (no active fix for this parent)
  loop._findActiveFixTaskForPR = async () => null

  await loop.checkPRReviews()

  assert.strictEqual(calls.createTask.length, 0,
    'must NOT create fix task when origTask is cancelled (Bug 2 fix)')
  const closedCalls = calls.updateCodeReview.filter(
    c => c.id === review.id && c.patch?.status === 'closed'
  )
  assert.ok(closedCalls.length >= 1,
    'review must be closed when origTask is in terminal/unexpected state')
}

// ── Test 3: Bug 2 — ready origTask (stale review) closes without fix task ──────

async function testBug2ReadyTaskClosesReview() {
  const review = {
    id: 'review-ready-task',
    pr_number: 88,
    branch_name: 'dev/fix-retry',
    task_id: 'task-ready',
    review_notes: { issues: [{ summary: 'Missing error handling' }] }
  }
  const origTask = {
    id: 'task-ready', title: 'Fix error handling',
    status: 'ready', retry_count: 1, max_retries: 3
  }

  const calls = { createTask: [], updateCodeReview: [] }
  const store = {
    supabase: {},
    getCodeReviews: async (_pid, filter) =>
      filter?.status === 'changes_requested' ? [review] : [],
    findTaskByTitle: async () => null,
    getTask: async (id) => id === origTask.id ? origTask : null,
    updateTask: async () => {},
    updateCodeReview: async (id, patch) => { calls.updateCodeReview.push({ id, patch }) },
    createTask: async (p) => { calls.createTask.push(p); return { id: 'should-not' } },
    query: () => makeQueryChain()
  }

  const loop = makeLoop(store)
  loop._findActiveFixTaskForPR = async () => null

  await loop.checkPRReviews()

  assert.strictEqual(calls.createTask.length, 0,
    'must NOT create fix task when origTask is already ready (stale review, Bug 2 fix)')
  const closedCalls = calls.updateCodeReview.filter(
    c => c.id === review.id && c.patch?.status === 'closed'
  )
  assert.ok(closedCalls.length >= 1,
    'stale review must be closed when origTask is being worked on')
}

// ── Test 4: Bug 3 — awaiting_merge with exhausted retries gets parked ──────────

async function testBug3AwaitingMergeExhaustedGetsParked() {
  const review = {
    id: 'review-exhausted',
    pr_number: 201,
    branch_name: 'dev/fix-exhausted',
    task_id: 'task-exhausted',
    review_notes: { issues: [{ summary: 'Persistent QC issue' }] }
  }
  const origTask = {
    id: 'task-exhausted', title: 'Fix feature X',
    status: 'awaiting_merge', retry_count: 3, max_retries: 3
  }

  const calls = { createTask: [], updateCodeReview: [], updateTask: [] }
  const store = {
    supabase: {},
    getCodeReviews: async (_pid, filter) =>
      filter?.status === 'changes_requested' ? [review] : [],
    findTaskByTitle: async () => null,
    getTask: async (id) => id === origTask.id ? origTask : null,
    updateTask: async (id, patch) => { calls.updateTask.push({ id, patch }) },
    updateCodeReview: async (id, patch) => { calls.updateCodeReview.push({ id, patch }) },
    createTask: async (p) => { calls.createTask.push(p); return { id: 'should-not' } },
    query: () => makeQueryChain()
  }

  const loop = makeLoop(store)
  loop._findActiveFixTaskForPR = async () => null

  await loop.checkPRReviews()

  assert.strictEqual(calls.createTask.length, 0,
    'must NOT create fix task when retry limit exhausted')

  // parkTask calls store.updateTask with status='failed' and PARKED: prefix
  const parkedCall = calls.updateTask.find(c =>
    c.id === origTask.id &&
    c.patch?.status === 'failed' &&
    typeof c.patch?.last_error === 'string' &&
    c.patch.last_error.startsWith('PARKED:')
  )
  assert.ok(parkedCall,
    'task must be parked (status=failed, last_error=PARKED:...) when retries exhausted (Bug 3 fix)')

  const resetCall = calls.updateTask.find(c =>
    c.id === origTask.id && c.patch?.status === 'ready'
  )
  assert.ok(!resetCall,
    'task must NOT be reset to ready when retries are exhausted — that is the infinite loop')
}

// ── Test 5: Dedup — active fix task for same parent prevents recreation ─────────

async function testDedupByParentTaskIdPreventsRecreation() {
  const review = {
    id: 'review-active-fix-exists',
    pr_number: 91,
    branch_name: 'dev/fix-with-active-task',
    task_id: 'task-parent',
    review_notes: { issues: [{ summary: 'QC issue that changed phrasing' }] }
  }

  const calls = { createTask: [], updateCodeReview: [] }
  const store = {
    supabase: {},
    getCodeReviews: async (_pid, filter) =>
      filter?.status === 'changes_requested' ? [review] : [],
    findTaskByTitle: async () => null,
    getTask: async () => null,
    updateTask: async () => {},
    updateCodeReview: async (id, patch) => { calls.updateCodeReview.push({ id, patch }) },
    createTask: async (p) => { calls.createTask.push(p); return { id: 'should-not' } },
    query: () => makeQueryChain()
  }

  const loop = makeLoop(store)
  // Active fix task exists for this parent_task_id (dedup should fire)
  loop._findActiveFixTaskForPR = async () => ({
    id: 'active-fix', title: 'Dev Fix: old summary', status: 'in_progress'
  })

  await loop.checkPRReviews()

  assert.strictEqual(calls.createTask.length, 0,
    'must NOT create fix task when an active fix already exists for same parent_task_id')

  // Review should still be closed even when dedup fires
  const closedCalls = calls.updateCodeReview.filter(
    c => c.id === review.id && c.patch?.status === 'closed'
  )
  assert.ok(closedCalls.length >= 1,
    'review must be closed even when dedup prevents a new fix task')
}

// ── Test runner ──────────────────────────────────────────────────────────────

async function runTests() {
  const tests = [
    ['Bug 1: fallback closes review after fix task creation', testBug1FallbackClosesReview],
    ['Bug 2: cancelled origTask → close review, no fix task', testBug2CancelledTaskClosesReview],
    ['Bug 2: ready origTask (stale review) → close review, no fix task', testBug2ReadyTaskClosesReview],
    ['Bug 3: awaiting_merge exhausted → parked, not reset', testBug3AwaitingMergeExhaustedGetsParked],
    ['Dedup: active fix for same parent prevents new fix task', testDedupByParentTaskIdPreventsRecreation]
  ]

  console.log('\n🧪 PR review loop dedup bug regression tests\n')
  let passed = 0

  for (const [name, fn] of tests) {
    try {
      await fn()
      console.log(`  ✅ ${name}`)
      passed++
    } catch (err) {
      console.error(`  ❌ ${name}`)
      console.error(`     ${err.message}`)
      if (process.env.DEBUG) console.error(err.stack)
    }
  }

  const total = tests.length
  console.log(`\n${passed === total ? '✅' : '❌'} ${passed}/${total} passed\n`)
  return { passed, total, passRate: passed / total }
}

if (require.main === module) {
  runTests().then(r => process.exit(r.passRate === 1.0 ? 0 : 1)).catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
}

module.exports = { runTests }
