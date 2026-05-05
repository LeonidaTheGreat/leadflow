'use strict'

/**
 * Regression test: enforceActions dedup must stop the create→fail→archive→create loop.
 *
 * Bug: When a Fix task exhausts all retries (status='failed', retry_count>=3), archiveStaleTasks
 * (step 6f) transitions it to status='cancelled' and sets updated_at=now. The SAME heartbeat
 * then ran enforceActions (step 6i), which only checked ['failed'] in the terminal dedup query —
 * not 'cancelled'. The freshly-archived task was invisible to dedup, so enforceActions
 * immediately re-created the Fix task, restarting the loop indefinitely.
 *
 * Fix: The terminal-status dedup query now checks ['failed', 'cancelled'] within 24h.
 *
 * What:   Tests for enforceActions() in ~/.openclaw/genome/core/task-hygiene.js
 * Verify: npx jest tests/genome/enforce-actions-dedup-cancelled.test.js --runInBand
 * Bounds: Do not modify task-hygiene.js directly from this test — it lives in the genome repo.
 *
 * Call-order inside enforceActions() per error (each query() call is indexed):
 *   index 0 — truthiness guard
 *   index 1 — activeQuery        (status IN ready/in_progress/backlog/failed)
 *   index 2 — doneQuery          (status=done, completed_at within 24h)
 *   index 3 — terminalRecentQuery (status IN failed/cancelled, updated_at within 24h)  ← fix
 */

const TASK_HYGIENE_PATH = '/Users/clawdbot/.openclaw/genome/core/task-hygiene'

beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}))
afterAll(() => jest.restoreAllMocks())

// ── Minimal mock builders ─────────────────────────────────────────────────────

function makeChainable(resultData) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: resultData || [] })
  }
  return chain
}

/**
 * queryQueue: ordered array of results for successive query() calls per error.
 * Entries beyond the queue length resolve to [] (no match).
 */
function makeExecutor({ queryQueue = [], errors = [] } = {}) {
  const createdTasks = []
  let callIndex = 0

  const query = jest.fn(() => {
    const resultData = callIndex < queryQueue.length ? queryQueue[callIndex] : []
    callIndex++
    return makeChainable(Array.isArray(resultData) ? resultData : [])
  })

  const store = {
    query,
    createTask: jest.fn(async (task) => { createdTasks.push(task); return { id: 'new-id', ...task } }),
    updateTask: jest.fn().mockResolvedValue(undefined),
    getTask: jest.fn().mockResolvedValue(null)
  }

  const executor = {
    store,
    taskQuery: null,
    projectId: 'genome',
    actions: [],
    errors,
    learner: { recordSuccess: jest.fn() },
    discoveryExtractor: { appendDetection: jest.fn(), resolveBySourceError: jest.fn() }
  }

  return { executor, store, createdTasks }
}

function loadHygiene(executor) {
  jest.resetModules()
  jest.doMock('/Users/clawdbot/.openclaw/genome/core/workflow-engine', () => ({
    buildRoleContext: jest.fn(() => ({ description: '' })),
    selectInitialModel: jest.fn(() => 'codex'),
    estimateCost: jest.fn(() => 0.01),
    normalizeAgentId: jest.fn(id => id)
  }))
  jest.doMock('/Users/clawdbot/.openclaw/genome/core/project-config-loader', () => ({
    resolveStatePath: jest.fn((f) => `/tmp/${f}`),
    getConfigForProject: jest.fn(() => ({ project_id: 'genome', project_dir: '/tmp/genome' }))
  }))
  jest.doMock('/Users/clawdbot/.openclaw/genome/core/priority-compute', () => ({
    computePriority: jest.fn(() => 2),
    getProjectSignals: jest.fn(() => ({}))
  }))
  jest.doMock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(false),
    readFileSync: jest.fn().mockReturnValue('[]'),
    writeFileSync: jest.fn()
  }))
  const { TaskHygiene } = require(TASK_HYGIENE_PATH)
  const hygiene = new TaskHygiene(executor)
  // Stub fix-watch to avoid fs side effects
  hygiene._readFixWatch = jest.fn(() => [])
  hygiene._writeFixWatch = jest.fn()
  hygiene._fixWatchCache = []
  return hygiene
}

// ── Regression tests ──────────────────────────────────────────────────────────

describe('enforceActions dedup — create→fail→archive→create loop (regression)', () => {
  test('does NOT re-create a Fix task when a matching task was recently cancelled', async () => {
    // Reproduces the bug: archiveStaleTasks moves an exhausted 'failed' task to 'cancelled'
    // and sets updated_at=now. Without 'cancelled' in the terminal dedup check, the very same
    // heartbeat re-created the Fix task, restarting the loop.
    //
    // index 0: truthiness guard         → [] (truthy, no data used)
    // index 1: activeQuery              → [] (no ready/in_progress/backlog/failed match)
    // index 2: doneQuery                → [] (no done match)
    // index 3: terminalRecentQuery      → [{ id: 'archived-task' }]  ← cancelled match → SKIP
    const { executor, createdTasks } = makeExecutor({
      queryQueue: [[], [], [], [{ id: 'archived-task' }]],
      errors: ['Pipeline: N ready tasks, 0 active for N consecutive heartbeats']
    })
    const hygiene = loadHygiene(executor)

    await hygiene.enforceActions()

    expect(createdTasks).toHaveLength(0)
  })

  test('does NOT re-create a Fix task when a matching task recently failed (max retries)', async () => {
    // Exhausted task still in 'failed' status (archiveStaleTasks has not run yet).
    // The terminal dedup check must catch it here before a duplicate is created.
    //
    // index 3: terminalRecentQuery → [{ id: 'exhausted-task' }]  ← failed match → SKIP
    const { executor, createdTasks } = makeExecutor({
      queryQueue: [[], [], [], [{ id: 'exhausted-task' }]],
      errors: ['Codebase: broken imports in lib/services/lead-service.js']
    })
    const hygiene = loadHygiene(executor)

    await hygiene.enforceActions()

    expect(createdTasks).toHaveLength(0)
  })

  test('DOES create a Fix task when no related task exists in any terminal or active state', async () => {
    // Normal path: no existing task of any status → a new Fix task should be created.
    // All four dedup queries return empty.
    const { executor, createdTasks } = makeExecutor({
      queryQueue: [[], [], [], []],
      errors: ['Pipeline: N ready tasks, 0 active for N consecutive heartbeats']
    })
    const hygiene = loadHygiene(executor)

    await hygiene.enforceActions()

    expect(createdTasks).toHaveLength(1)
    expect(createdTasks[0].title).toMatch(/^Fix:/)
  })

  test('does NOT create a Fix task when an active task (ready/in_progress) already exists', async () => {
    // Active task found at index 1 → immediate skip; terminal check not reached.
    const { executor, createdTasks } = makeExecutor({
      queryQueue: [[], [{ id: 'active-task' }]],
      errors: ['Some heartbeat error']
    })
    const hygiene = loadHygiene(executor)

    await hygiene.enforceActions()

    expect(createdTasks).toHaveLength(0)
  })

  test('does NOT create a Fix task when a done task completed recently', async () => {
    // Done task found at index 2 → skip; terminal check not reached.
    const { executor, createdTasks } = makeExecutor({
      queryQueue: [[], [], [{ id: 'done-task' }]],
      errors: ['Some previously fixed error']
    })
    const hygiene = loadHygiene(executor)

    await hygiene.enforceActions()

    expect(createdTasks).toHaveLength(0)
  })
})
