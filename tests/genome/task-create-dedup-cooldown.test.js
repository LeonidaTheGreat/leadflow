'use strict'

/**
 * Regression test: task-create.js dedup cooldown prevents failed QC task recreation loop
 *
 * Task: f2987697-6bec-4712-9c58-4eded57a7d89
 *
 * Root cause: commit 089e1a5 added a 2h cooldown using findTaskByTitle, which
 * excludes 'failed' tasks from DB results — so the cooldown never fired. QC tasks
 * that failed were immediately re-created every heartbeat, causing infinite loops.
 *
 * Fix: use findLatestTaskByTitle (includes all statuses) for the cooldown lookup.
 *      Handle Postgres timestamps without UTC Z suffix to prevent local-time parse errors.
 *
 * What:   Tests the actual task-create.js from ~/.openclaw/genome/core/actuators/
 * Verify: npx jest tests/genome/task-create-dedup-cooldown.test.js --runInBand
 * Bounds: Do not modify task-create.js or any genome files via this test.
 */

const TASK_CREATE_PATH = '/Users/clawdbot/.openclaw/genome/core/actuators/task-create'

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

describe('task-create cooldown — prevent failed QC task recreation loop', () => {
  let create

  beforeAll(() => {
    ;({ create } = require(TASK_CREATE_PATH))
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
    expect(store.createTask).not.toHaveBeenCalled()
  })

  test('blocks when QC task failed 30 minutes ago (within 2h cooldown)', async () => {
    // OLD BUG: findTaskByTitle filtered out 'failed' tasks — cooldown never fired.
    // FIX: findLatestTaskByTitle includes all statuses including 'failed'.
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
    expect(store.createTask).not.toHaveBeenCalled()
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
    // PostgreSQL omits Z — without the fix, JS parses as local time, adding hours of offset.
    // A failure 30 minutes ago would appear as hours-old (past cooldown) on UTC-offset machines.
    const recentFailedAt = minutesAgo(30).replace('Z', '')
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: recentFailedAt }
    })
    const result = await create(store, taskDef)
    expect(result).toBeNull()
    expect(store.createTask).not.toHaveBeenCalled()
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
