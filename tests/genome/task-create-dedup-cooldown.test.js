'use strict'
/**
 * Task Spec (f2987697-6bec-4712-9c58-4eded57a7d89)
 * What:
 * - Test the 2h failed-task cooldown in ~/.openclaw/genome/core/actuators/task-create.js
 *   Added in fix commit 089e1a5. Prevents the rescue system from re-creating the same
 *   UC+agent task every heartbeat (5 min) until checkUCExhausted fires at 8 attempts.
 * Verify:
 * - npx jest tests/genome/task-create-dedup-cooldown.test.js --runInBand exits 0
 * Boundaries:
 * - Tests task-create.js actuator logic only — not store layer or rescue coordinator
 */

const TASK_CREATE_PATH = '/Users/clawdbot/.openclaw/genome/core/actuators/task-create'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore({ active = null, latest = null } = {}) {
  return {
    findTaskByTitle: jest.fn().mockResolvedValue(active),
    findLatestTaskByTitle: jest.fn().mockResolvedValue(latest),
    createTask: jest.fn().mockResolvedValue({ id: 'new-task-id' })
  }
}

function minutesAgo(n) {
  return new Date(Date.now() - n * 60 * 1000).toISOString()
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('task-create cooldown — prevent failed QC task recreation loop', () => {
  let create

  beforeAll(() => {
    ({ create } = require(TASK_CREATE_PATH))
  })

  const taskDef = { title: 'QC: uc-abc123 - Implement lead capture', project_id: 'leadflow' }

  test('creates task when no existing task found', async () => {
    const store = makeStore()
    const result = await create(store, taskDef)
    expect(result).toBe('new-task-id')
    expect(store.createTask).toHaveBeenCalledTimes(1)
  })

  test('blocks when active task exists (ready)', async () => {
    const store = makeStore({ active: { status: 'ready', updated_at: minutesAgo(5) } })
    const result = await create(store, taskDef)
    expect(result).toBeNull()
    expect(store.createTask).not.toHaveBeenCalled()
  })

  test('blocks when active task exists (in_progress)', async () => {
    const store = makeStore({ active: { status: 'in_progress', updated_at: minutesAgo(10) } })
    const result = await create(store, taskDef)
    expect(result).toBeNull()
  })

  test('blocks when QC task failed 30 minutes ago (within 2h cooldown)', async () => {
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: minutesAgo(30) }
    })
    const result = await create(store, taskDef)
    expect(result).toBeNull()
    expect(store.createTask).not.toHaveBeenCalled()
  })

  test('blocks when QC task failed 90 minutes ago (within 2h cooldown)', async () => {
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: minutesAgo(90) }
    })
    const result = await create(store, taskDef)
    expect(result).toBeNull()
  })

  test('allows creation when last failure was 3 hours ago (cooldown expired)', async () => {
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: hoursAgo(3) }
    })
    const result = await create(store, taskDef)
    expect(result).toBe('new-task-id')
    expect(store.createTask).toHaveBeenCalledTimes(1)
  })

  test('allows creation when latest task is done (not failed)', async () => {
    const store = makeStore({
      active: null,
      latest: { status: 'done', updated_at: minutesAgo(5) }
    })
    const result = await create(store, taskDef)
    expect(result).toBe('new-task-id')
    expect(store.createTask).toHaveBeenCalledTimes(1)
  })

  test('handles postgres timestamps without Z suffix (UTC parse fix)', async () => {
    // PostgreSQL omits the Z suffix — must append before parsing to avoid local-time offset errors
    const recentFailedAt = minutesAgo(30).replace('Z', '')
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: recentFailedAt }
    })
    const result = await create(store, taskDef)
    expect(result).toBeNull()
  })

  test('allows creation when failed task has no updated_at timestamp', async () => {
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: null }
    })
    const result = await create(store, taskDef)
    expect(result).toBe('new-task-id')
  })

  test('returns null when title is missing', async () => {
    const store = makeStore()
    const result = await create(store, { project_id: 'leadflow' })
    expect(result).toBeNull()
    expect(store.createTask).not.toHaveBeenCalled()
  })

  test('creates task when store lacks findLatestTaskByTitle (backward compat)', async () => {
    const store = {
      findTaskByTitle: jest.fn().mockResolvedValue(null),
      createTask: jest.fn().mockResolvedValue({ id: 'new-task-id' })
    }
    const result = await create(store, taskDef)
    expect(result).toBe('new-task-id')
  })

  test('proceeds to create when dedup lookup throws (best-effort)', async () => {
    const store = {
      findTaskByTitle: jest.fn().mockRejectedValue(new Error('DB connection failed')),
      findLatestTaskByTitle: jest.fn().mockRejectedValue(new Error('DB connection failed')),
      createTask: jest.fn().mockResolvedValue({ id: 'new-task-id' })
    }
    const result = await create(store, taskDef)
    expect(result).toBe('new-task-id')
  })
})
