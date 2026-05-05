'use strict'
/**
 * Task Spec (f2987697-6bec-4712-9c58-4eded57a7d89)
 * What:
 * - Fix and test the 2h failed-task cooldown in task-create.js actuator.
 *   Bug: commit 089e1a5 added a cooldown check using findTaskByTitle, which
 *   explicitly excludes failed tasks from DB results — so the check never fired.
 *   Fix: use findLatestTaskByTitle (includes all statuses) for the cooldown lookup,
 *   and handle Postgres timestamps without UTC Z suffix.
 * Verify:
 * - npx jest tests/genome/task-create-dedup-cooldown.test.js --runInBand exits 0
 * Boundaries:
 * - Self-contained: tests the logic specification, not the genome file state
 *   (genome is a shared repo and its active branch changes between agents)
 */

// ── Reference implementation of the fixed create() logic ──────────────────────
// This mirrors what task-create.js SHOULD contain after the fix.
// When the genome's task-create.js is confirmed fixed, this file can be
// replaced with a direct import to verify the implementation.

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

async function createWithCooldown(store, taskDef) {
  if (!taskDef.title) return null

  try {
    // Active-task dedup: findTaskByTitle returns only active statuses (not done/failed/cancelled)
    const existing = await store.findTaskByTitle(taskDef.title)
    if (existing && ['ready', 'in_progress', 'awaiting_merge', 'blocked', 'backlog'].includes(existing.status)) {
      return null
    }

    // Cooldown: findTaskByTitle excludes failed status — use findLatestTaskByTitle
    // (returns all statuses) to check for a recent failure.
    const latest = await store.findLatestTaskByTitle?.(taskDef.title)
    if (latest?.status === 'failed') {
      const ts = latest.updated_at
      // Append Z to handle Postgres timestamps without UTC suffix (prevents local-time parse errors)
      const failedAt = ts && new Date(typeof ts === 'string' && !ts.endsWith('Z') ? ts + 'Z' : ts).getTime()
      if (failedAt && (Date.now() - failedAt) < TWO_HOURS_MS) return null
    }
  } catch {} // dedup is best-effort — never block task creation on a dedup error

  const task = await store.createTask({
    status: 'ready',
    agent_id: 'dev',
    model: 'sonnet',
    priority: 3,
    ...taskDef
  })
  return task?.id || task || null
}

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
  const taskDef = { title: 'QC: uc-abc123 - Implement lead capture', project_id: 'leadflow' }

  test('creates task when no existing task found', async () => {
    const store = makeStore()
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBe('new-task-id')
    expect(store.createTask).toHaveBeenCalledTimes(1)
  })

  test('blocks when active task exists (ready)', async () => {
    const store = makeStore({ active: { status: 'ready', updated_at: minutesAgo(5) } })
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBeNull()
    expect(store.createTask).not.toHaveBeenCalled()
  })

  test('blocks when active task exists (in_progress)', async () => {
    const store = makeStore({ active: { status: 'in_progress', updated_at: minutesAgo(10) } })
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBeNull()
  })

  test('blocks when QC task failed 30 minutes ago (within 2h cooldown)', async () => {
    // ROOT CAUSE: the OLD code used findTaskByTitle which filters out 'failed' status.
    // The check `if (existing && existing.status === 'failed')` never fires.
    // FIX: use findLatestTaskByTitle which includes all statuses.
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: minutesAgo(30) }
    })
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBeNull()
    expect(store.createTask).not.toHaveBeenCalled()
  })

  test('blocks when QC task failed 90 minutes ago (within 2h cooldown)', async () => {
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: minutesAgo(90) }
    })
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBeNull()
  })

  test('allows creation when last failure was 3 hours ago (cooldown expired)', async () => {
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: hoursAgo(3) }
    })
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBe('new-task-id')
    expect(store.createTask).toHaveBeenCalledTimes(1)
  })

  test('allows creation when latest task is done (not failed)', async () => {
    const store = makeStore({
      active: null,
      latest: { status: 'done', updated_at: minutesAgo(5) }
    })
    const result = await createWithCooldown(store, taskDef)
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
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBeNull()
  })

  test('allows creation when failed task has no updated_at timestamp', async () => {
    const store = makeStore({
      active: null,
      latest: { status: 'failed', updated_at: null }
    })
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBe('new-task-id')
  })

  test('returns null when title is missing', async () => {
    const store = makeStore()
    const result = await createWithCooldown(store, { project_id: 'leadflow' })
    expect(result).toBeNull()
    expect(store.createTask).not.toHaveBeenCalled()
  })

  test('creates task when store lacks findLatestTaskByTitle (backward compat)', async () => {
    const store = {
      findTaskByTitle: jest.fn().mockResolvedValue(null),
      createTask: jest.fn().mockResolvedValue({ id: 'new-task-id' })
    }
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBe('new-task-id')
  })

  test('proceeds to create when dedup lookup throws (best-effort)', async () => {
    const store = {
      findTaskByTitle: jest.fn().mockRejectedValue(new Error('DB connection failed')),
      findLatestTaskByTitle: jest.fn().mockRejectedValue(new Error('DB connection failed')),
      createTask: jest.fn().mockResolvedValue({ id: 'new-task-id' })
    }
    const result = await createWithCooldown(store, taskDef)
    expect(result).toBe('new-task-id')
  })
})
