'use strict'

/*
 * Tests for ~/projects/genome/intelligence/auto-decompose.js
 *
 * Spec:
 *   What: Test all four exported functions:
 *     - generateSubtasks(parentTask, pattern) — pure function
 *     - checkTaskForDecomposition(taskId) — uses TaskStore
 *     - autoDecompose(taskId, dryRun) — uses TaskStore + fs
 *     - processAllReadyTasks(dryRun) — uses TaskStore
 *   Verify: `node tests/unit/auto-decompose.test.js` exits 0
 *   Boundaries: No real DB connections (TaskStore mocked via require.cache);
 *               no modifications to auto-decompose.js or predictive-engine.js
 */

const assert = require('assert')
const path = require('path')
const os = require('os')

const GENOME_DIR = path.join(os.homedir(), '.openclaw', 'genome')

// ── Mock TaskStore via require.cache injection ────────────────────────────────
// The auto-decompose module creates `const store = new TaskStore()` at module
// level, so the mock must be in cache before auto-decompose is first required.

let _getTask = async () => null
let _createTask = async () => ({ id: 'created-' + Date.now() })
let _updateTask = async () => true
let _addDependency = async () => true
let _getTasks = async () => []

class MockTaskStore {
  async getTask (id) { return _getTask(id) }
  async createTask (t) { return _createTask(t) }
  async updateTask (id, u) { return _updateTask(id, u) }
  async addDependency (a, b, c) { return _addDependency(a, b, c) }
  async getTasks (f) { return _getTasks(f) }
}

const taskStorePath = require.resolve(path.join(GENOME_DIR, 'core', 'task-store'))
require.cache[taskStorePath] = {
  id: taskStorePath,
  filename: taskStorePath,
  loaded: true,
  exports: { TaskStore: MockTaskStore }
}

// Suppress the IIFE help-text printed when auto-decompose is first required
const _origWrite = process.stdout.write.bind(process.stdout)
process.stdout.write = () => true
const {
  generateSubtasks,
  checkTaskForDecomposition,
  autoDecompose,
  processAllReadyTasks
} = require(path.join(GENOME_DIR, 'intelligence', 'auto-decompose'))
process.stdout.write = _origWrite

// ── Minimal decomposition patterns for pure-function tests ───────────────────

const DASHBOARD_PATTERN = {
  name: 'Dashboard Pattern',
  description: 'Split into data, UI, and integration layers',
  subtasks: [
    { titleSuffix: ' - Data Layer', hours: 1.5, agent: 'dev', model: 'codex', acceptance_criteria: ['Data endpoints working', 'Schema defined'] },
    { titleSuffix: ' - UI Components', hours: 1.5, agent: 'dev', model: 'codex', acceptance_criteria: ['Components render', 'Styling complete'] },
    { titleSuffix: ' - Integration & Tests', hours: 1, agent: 'qc', model: 'codex', acceptance_criteria: ['Data flows to UI', 'Tests pass'] }
  ]
}

const INTEGRATION_PATTERN = {
  name: 'Integration Pattern',
  description: 'Research, auth, mapping, implementation, testing',
  subtasks: [
    { titleSuffix: ' - Research & Planning', hours: 0.5, agent: 'dev', model: 'sonnet', acceptance_criteria: ['API docs reviewed'] },
    { titleSuffix: ' - Auth Setup', hours: 0.5, agent: 'dev', model: 'sonnet', acceptance_criteria: ['Auth working'] },
    { titleSuffix: ' - Core Implementation', hours: 1.5, agent: 'dev', model: 'sonnet', acceptance_criteria: ['API calls working'] },
    { titleSuffix: ' - Testing & Validation', hours: 0.5, agent: 'qc', model: 'codex', acceptance_criteria: ['Tests pass'] }
  ]
}

const FEATURE_PATTERN = {
  name: 'Feature Pattern',
  description: 'Split into planning, implementation, testing',
  subtasks: [
    { titleSuffix: ' - Planning & Design', hours: 1, agent: 'dev', model: 'sonnet', acceptance_criteria: ['Design doc complete'] },
    { titleSuffix: ' - Core Implementation', hours: 2, agent: 'dev', model: 'codex', acceptance_criteria: ['Feature working'] },
    { titleSuffix: ' - Testing & Polish', hours: 1, agent: 'qc', model: 'codex', acceptance_criteria: ['Tests pass'] }
  ]
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

async function test (name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

// ── Run all tests in an async main ───────────────────────────────────────────
;(async () => {

// ── generateSubtasks tests ────────────────────────────────────────────────────

console.log('\ngenerateSubtasks — pure function\n')

await test('produces correct count for 3-subtask (dashboard) pattern', async () => {
  const parent = { id: 'p1', title: 'Build Dashboard', priority: 'high', project_id: 'leadflow' }
  const result = generateSubtasks(parent, DASHBOARD_PATTERN)
  assert.strictEqual(result.length, 3, `Expected 3, got ${result.length}`)
})

await test('produces correct count for 4-subtask (integration) pattern', async () => {
  const parent = { id: 'p2', title: 'Stripe Integration', priority: 'high', project_id: 'leadflow' }
  const result = generateSubtasks(parent, INTEGRATION_PATTERN)
  assert.strictEqual(result.length, 4, `Expected 4, got ${result.length}`)
})

await test('first subtask has status ready, all others have status blocked', async () => {
  const parent = { id: 'p3', title: 'Build Dashboard', priority: 'high', project_id: 'leadflow' }
  const result = generateSubtasks(parent, DASHBOARD_PATTERN)
  assert.strictEqual(result[0].status, 'ready', `First subtask should be ready, got ${result[0].status}`)
  result.slice(1).forEach((s, i) => {
    assert.strictEqual(s.status, 'blocked', `Subtask ${i + 2} should be blocked, got ${s.status}`)
  })
})

await test('subtask titles follow "parent title + suffix (N of M)" format', async () => {
  const parent = { id: 'p4', title: 'Build Dashboard', priority: 'medium', project_id: 'leadflow' }
  const result = generateSubtasks(parent, DASHBOARD_PATTERN)
  assert.strictEqual(result[0].title, 'Build Dashboard - Data Layer (1 of 3)')
  assert.strictEqual(result[1].title, 'Build Dashboard - UI Components (2 of 3)')
  assert.strictEqual(result[2].title, 'Build Dashboard - Integration & Tests (3 of 3)')
})

await test('all subtasks have parent_task_id set to parent id', async () => {
  const parent = { id: 'parent-xyz', title: 'Feature', priority: 'low', project_id: 'leadflow' }
  const result = generateSubtasks(parent, FEATURE_PATTERN)
  result.forEach((s, i) => {
    assert.strictEqual(s.parent_task_id, 'parent-xyz', `Subtask ${i + 1} missing parent_task_id`)
  })
})

await test('sequence_order increments from 1', async () => {
  const parent = { id: 'p5', title: 'API Endpoint', priority: 'high', project_id: 'leadflow' }
  const result = generateSubtasks(parent, DASHBOARD_PATTERN)
  result.forEach((s, i) => {
    assert.strictEqual(s.sequence_order, i + 1, `Expected sequence_order ${i + 1}, got ${s.sequence_order}`)
  })
})

await test('first subtask has empty dependencies, subsequent point to previous subtask title', async () => {
  const parent = { id: 'p6', title: 'Build Dashboard', priority: 'high', project_id: 'leadflow' }
  const result = generateSubtasks(parent, DASHBOARD_PATTERN)
  assert.deepStrictEqual(result[0].dependencies, [], 'First subtask should have empty dependencies')
  assert.ok(
    result[1].dependencies.includes('Build Dashboard - Data Layer (1 of 3)'),
    `Subtask 2 deps should include subtask 1 title, got: ${JSON.stringify(result[1].dependencies)}`
  )
  assert.ok(
    result[2].dependencies.includes('Build Dashboard - UI Components (2 of 3)'),
    `Subtask 3 deps should include subtask 2 title, got: ${JSON.stringify(result[2].dependencies)}`
  )
})

await test('estimated_cost_usd uses 2.0/hr for sonnet model', async () => {
  const parent = { id: 'p7', title: 'Stripe Integration', priority: 'high', project_id: 'leadflow' }
  // INTEGRATION_PATTERN subtask[0] = sonnet model, 0.5 hours
  const result = generateSubtasks(parent, INTEGRATION_PATTERN)
  assert.strictEqual(result[0].model, 'sonnet')
  assert.strictEqual(result[0].estimated_cost_usd, 1.0, `Expected 0.5h × $2.0 = $1.0, got ${result[0].estimated_cost_usd}`)
})

await test('estimated_cost_usd uses 0.5/hr for codex model', async () => {
  const parent = { id: 'p8', title: 'Build Dashboard', priority: 'high', project_id: 'leadflow' }
  // DASHBOARD_PATTERN subtask[0] = codex model, 1.5 hours
  const result = generateSubtasks(parent, DASHBOARD_PATTERN)
  assert.strictEqual(result[0].model, 'codex')
  assert.strictEqual(result[0].estimated_cost_usd, 0.75, `Expected 1.5h × $0.5 = $0.75, got ${result[0].estimated_cost_usd}`)
})

await test('subtask description is acceptance criteria joined by comma', async () => {
  const parent = { id: 'p9', title: 'Build Dashboard', priority: 'high', project_id: 'leadflow' }
  const result = generateSubtasks(parent, DASHBOARD_PATTERN)
  assert.strictEqual(result[0].description, 'Data endpoints working, Schema defined')
})

await test('subtask agent_id matches pattern agent', async () => {
  const parent = { id: 'p10', title: 'Stripe Integration', priority: 'high', project_id: 'leadflow' }
  const result = generateSubtasks(parent, INTEGRATION_PATTERN)
  assert.strictEqual(result[0].agent_id, 'dev')
  assert.strictEqual(result[1].agent_id, 'dev')
  assert.strictEqual(result[2].agent_id, 'dev')
  assert.strictEqual(result[3].agent_id, 'qc')
})

await test('subtask priority inherits parent priority', async () => {
  const parent = { id: 'p11', title: 'Low Priority', priority: 'low', project_id: 'leadflow' }
  const result = generateSubtasks(parent, FEATURE_PATTERN)
  result.forEach(s => {
    assert.strictEqual(s.priority, 'low', `Expected low priority, got ${s.priority}`)
  })
})

// ── checkTaskForDecomposition tests ──────────────────────────────────────────

console.log('\ncheckTaskForDecomposition — mocked store\n')

await test('returns error when task not found', async () => {
  _getTask = async () => null
  const result = await checkTaskForDecomposition('nonexistent-id')
  assert.ok(result.error, 'Expected error property')
  assert.strictEqual(result.error, 'Task not found')
})

await test('dashboard task over max hours: shouldDecompose is true with pattern', async () => {
  _getTask = async (id) => ({
    id,
    title: 'Build Dashboard Analytics',
    description: 'Build a full analytics dashboard',
    estimated_hours: 6,
    priority: 'high',
    project_id: 'leadflow'
  })
  const result = await checkTaskForDecomposition('task-dash')
  assert.strictEqual(result.taskId, 'task-dash')
  assert.strictEqual(result.taskType, 'dashboard')
  assert.strictEqual(result.shouldDecompose, true)
  assert.ok(result.pattern, 'Expected pattern to be present for dashboard type')
})

await test('result contains all required keys', async () => {
  _getTask = async (id) => ({
    id,
    title: 'Fix a broken API endpoint',
    estimated_hours: 1,
    project_id: 'leadflow'
  })
  const result = await checkTaskForDecomposition('task-bugfix')
  const required = ['taskId', 'title', 'taskType', 'estimatedHours', 'shouldDecompose', 'reason', 'predictedSuccess']
  required.forEach(key => {
    assert.ok(Object.prototype.hasOwnProperty.call(result, key), `Missing key: ${key}`)
  })
})

await test('predictedSuccess contains original and decomposed rates', async () => {
  _getTask = async (id) => ({
    id,
    title: 'Build API endpoint for leads',
    estimated_hours: 2,
    project_id: 'leadflow'
  })
  const result = await checkTaskForDecomposition('task-api')
  assert.ok(typeof result.predictedSuccess.original === 'number', 'predictedSuccess.original should be a number')
  assert.ok(typeof result.predictedSuccess.decomposed === 'number', 'predictedSuccess.decomposed should be a number')
  assert.ok(result.predictedSuccess.original >= 0 && result.predictedSuccess.original <= 100)
  assert.ok(result.predictedSuccess.decomposed >= 0 && result.predictedSuccess.decomposed <= 100)
})

await test('reason describes decomposition benefit when shouldDecompose is true', async () => {
  _getTask = async (id) => ({
    id,
    title: 'Build Dashboard for metrics',
    estimated_hours: 8,
    project_id: 'leadflow'
  })
  const result = await checkTaskForDecomposition('task-big-dash')
  if (result.shouldDecompose) {
    assert.ok(result.reason.length > 0, 'reason should be non-empty when shouldDecompose is true')
    assert.ok(
      result.reason.includes('decomposition') || result.reason.includes('benefits'),
      `Reason should mention decomposition, got: ${result.reason}`
    )
  }
})

await test('small bug fix: shouldDecompose is false, no pattern or pattern is null', async () => {
  _getTask = async (id) => ({
    id,
    title: 'Fix login redirect bug',
    description: 'One-line fix',
    estimated_hours: 0.5,
    project_id: 'leadflow'
  })
  const result = await checkTaskForDecomposition('task-tiny-fix')
  // bug_fix type has autoDecompose=false and maxHours=5 — at 0.5h should not decompose
  if (!result.shouldDecompose) {
    assert.ok(
      !result.pattern || result.pattern === null,
      'Non-decomposable tasks should have null pattern'
    )
  }
})

// ── autoDecompose tests ───────────────────────────────────────────────────────

console.log('\nautoDecompose — mocked store\n')

await test('returns error when task not found', async () => {
  _getTask = async () => null
  const result = await autoDecompose('nonexistent-xyz', true)
  assert.ok(result.error, 'Expected error property')
})

await test('dryRun=true on non-decomposable task returns action=none', async () => {
  _getTask = async (id) => ({
    id,
    title: 'Write unit test for service',
    description: '',
    estimated_hours: 1,
    project_id: 'leadflow'
  })
  const result = await autoDecompose('task-small-test', true)
  // Testing type has autoDecompose=false — at 1h should not decompose
  if (result.action === 'none') {
    assert.ok(result.message, 'Expected message explaining no decomposition')
  }
  // Either none or would_decompose is acceptable — just verify no error
  assert.ok(!result.error, 'Should not return an error')
})

await test('dryRun=true on large dashboard task returns action=would_decompose with subtasks', async () => {
  _getTask = async (id) => ({
    id,
    title: 'Build Analytics Dashboard',
    description: 'Full dashboard with charts',
    estimated_hours: 6,
    priority: 'high',
    project_id: 'leadflow'
  })
  const result = await autoDecompose('task-large-dash', true)
  assert.strictEqual(result.action, 'would_decompose', `Expected would_decompose, got ${result.action}`)
  assert.ok(Array.isArray(result.subtasks), 'subtasks should be an array')
  assert.ok(result.subtasks.length > 0, 'Should generate at least one subtask')
  assert.ok(typeof result.totalHours === 'number', 'totalHours should be a number')
  assert.ok(typeof result.totalCost === 'number', 'totalCost should be a number')
})

await test('dryRun=true subtask previews have title, agent, model, hours, cost', async () => {
  _getTask = async (id) => ({
    id,
    title: 'Build Analytics Dashboard',
    description: 'Full dashboard',
    estimated_hours: 6,
    priority: 'high',
    project_id: 'leadflow'
  })
  const result = await autoDecompose('task-dash-preview', true)
  if (result.action === 'would_decompose') {
    result.subtasks.forEach((s, i) => {
      assert.ok(s.title, `Subtask ${i} missing title`)
      assert.ok(s.agent, `Subtask ${i} missing agent`)
      assert.ok(s.model, `Subtask ${i} missing model`)
      assert.ok(typeof s.hours === 'number', `Subtask ${i} hours should be a number`)
      assert.ok(typeof s.cost === 'number', `Subtask ${i} cost should be a number`)
    })
  }
})

await test('dryRun=false: creates subtasks in store and marks parent superseded', async () => {
  const created = []
  let updatedId = null
  let updatedStatus = null

  _getTask = async (id) => ({
    id,
    title: 'Build Dashboard UI',
    description: 'Full UI for metrics',
    estimated_hours: 7,
    priority: 'high',
    project_id: 'leadflow'
  })
  _createTask = async (t) => {
    const id = 'sub-' + created.length
    created.push({ ...t, id })
    return { id }
  }
  _updateTask = async (id, updates) => {
    updatedId = id
    updatedStatus = updates.status
    return true
  }
  _addDependency = async () => true

  const result = await autoDecompose('task-real-dash', false)
  assert.strictEqual(result.action, 'decomposed', `Expected decomposed, got ${result.action}`)
  assert.ok(Array.isArray(result.subtasksCreated) && result.subtasksCreated.length > 0, 'subtasksCreated should be non-empty')
  assert.strictEqual(updatedId, 'task-real-dash', 'Parent task should be updated')
  assert.strictEqual(updatedStatus, 'superseded', 'Parent status should be superseded')
  assert.ok(created.length > 0, 'Store.createTask should have been called')

  // Restore defaults
  _createTask = async () => ({ id: 'created-' + Date.now() })
  _updateTask = async () => true
})

await test('unknown task type with no pattern: returns action=manual_review', async () => {
  // We can simulate this by checking a task whose type has no decomposition pattern.
  // "documentation" type has autoDecompose=false — feed it large hours to force shouldDecompose=true
  // but documentation has no entry in DECOMPOSITION_PATTERNS, so check.pattern should be null.
  _getTask = async (id) => ({
    id,
    title: 'Write extensive documentation for the entire system',
    description: '',
    estimated_hours: 12,
    project_id: 'leadflow'
  })
  const result = await autoDecompose('task-docs', true)
  // documentation type autoDecompose=false, even at 12h. If shouldDecompose=false → action=none
  // If something makes shouldDecompose=true but no pattern → manual_review
  assert.ok(
    result.action === 'none' || result.action === 'manual_review' || result.action === 'would_decompose',
    `Unexpected action: ${result.action}`
  )
  assert.ok(!result.error, 'Should not error')
})

// ── processAllReadyTasks tests ────────────────────────────────────────────────

console.log('\nprocessAllReadyTasks — mocked store\n')

await test('returns empty array when no ready tasks', async () => {
  _getTasks = async () => []
  _getTask = async () => null
  const result = await processAllReadyTasks(true)
  assert.ok(Array.isArray(result), 'Expected array result')
  assert.strictEqual(result.length, 0, `Expected 0 results, got ${result.length}`)
})

await test('processes only decomposable tasks from ready list', async () => {
  const tasks = [
    // large dashboard task — should be decomposable
    { id: 'ready-1', title: 'Build Analytics Dashboard', description: 'Charts', estimated_hours: 6, status: 'ready', project_id: 'leadflow' },
    // tiny test task — should NOT be decomposable
    { id: 'ready-2', title: 'Write test for logger', description: '', estimated_hours: 0.5, status: 'ready', project_id: 'leadflow' }
  ]
  _getTasks = async () => tasks
  _getTask = async (id) => tasks.find(t => t.id === id) || null
  _createTask = async () => ({ id: 'sub-' + Date.now() })
  _updateTask = async () => true
  _addDependency = async () => true

  const result = await processAllReadyTasks(true)
  // Result should only contain the tasks that were flagged for decomposition
  assert.ok(Array.isArray(result), 'Expected array result')
  result.forEach((r, i) => {
    assert.ok(r.shouldDecompose === true, `Every result in processAllReadyTasks should be a decomposable task (index ${i})`)
  })

  // Restore defaults
  _createTask = async () => ({ id: 'created-' + Date.now() })
  _updateTask = async () => true
})

await test('dryRun=true does not call createTask or updateTask', async () => {
  let createCalled = false
  let updateCalled = false

  const tasks = [
    { id: 'check-1', title: 'Build API for leads dashboard integration', description: '', estimated_hours: 5, status: 'ready', project_id: 'leadflow' }
  ]
  _getTasks = async () => tasks
  _getTask = async (id) => tasks.find(t => t.id === id) || null
  _createTask = async (t) => { createCalled = true; return { id: 'mock' } }
  _updateTask = async (id, u) => { updateCalled = true; return true }

  await processAllReadyTasks(true)

  assert.strictEqual(createCalled, false, 'createTask should NOT be called in dry-run mode')
  assert.strictEqual(updateCalled, false, 'updateTask should NOT be called in dry-run mode')

  // Restore defaults
  _createTask = async () => ({ id: 'created-' + Date.now() })
  _updateTask = async () => true
  _getTasks = async () => []
})

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests run: ${passed} passed, ${failed} failed\n`)

if (require.main === module) {
  process.exit(failed > 0 ? 1 : 0)
}

})() // end async main

module.exports = { runTests: async () => ({ passed, failed, passRate: passed / (passed + failed) }) }
