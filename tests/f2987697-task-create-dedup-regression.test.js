'use strict'
/**
 * Regression guard: task-create.js failed-task 2h cooldown (f2987697)
 *
 * Bug: findTaskByTitle() filters out 'failed' status at DB level, so the 2h
 * cooldown check was dead code. QC tasks were recreated every heartbeat after failure.
 *
 * Fix in genome: task-create.js now uses findLatestTaskByTitle?.() (includes all
 * statuses) for the failed-task cooldown check.
 *
 * This test verifies the logic is correct using an inline implementation
 * that mirrors the fix, serving as a specification guard.
 */

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

/**
 * Mirrors the fixed task-create.js logic for regression testing.
 * When updating task-create.js, update this mirror too.
 */
async function createWithDedup(store, taskDef) {
  if (!taskDef.title) return null
  try {
    const active = await store.findTaskByTitle(taskDef.title)
    if (active && ['ready', 'in_progress', 'awaiting_merge', 'blocked', 'backlog'].includes(active.status)) {
      return null
    }
    const latest = await store.findLatestTaskByTitle?.(taskDef.title)
    if (latest && latest.status === 'failed') {
      const ts = latest.updated_at
      const failedAt = ts && new Date(ts.endsWith('Z') ? ts : ts + 'Z').getTime()
      if (failedAt && (Date.now() - failedAt) < TWO_HOURS_MS) return null
    }
  } catch {}
  return (await store.createTask(taskDef))?.id || null
}

function makeStore({ active = null, latest = null } = {}) {
  return {
    findTaskByTitle: () => Promise.resolve(active),
    findLatestTaskByTitle: () => Promise.resolve(latest),
    createTask: () => Promise.resolve({ id: 'new-task-id' })
  }
}

describe('genome task-create dedup cooldown regression (f2987697)', () => {
  const taskDef = { title: 'QC Review: feat/regression-test', project_id: 'leadflow' }

  test('blocks recreation when findTaskByTitle returns null but findLatestTaskByTitle has recent failure', async () => {
    // Simulates production: findTaskByTitle excludes failed (returns null),
    // findLatestTaskByTitle returns the failed task — cooldown must block recreation
    const recentFailedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const store = makeStore({ active: null, latest: { status: 'failed', updated_at: recentFailedAt } })
    expect(await createWithDedup(store, taskDef)).toBeNull()
  })

  test('allows recreation after 2h cooldown expires', async () => {
    const oldFailedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    const store = makeStore({ active: null, latest: { status: 'failed', updated_at: oldFailedAt } })
    expect(await createWithDedup(store, taskDef)).toBe('new-task-id')
  })

  test('handles postgres timestamp without Z suffix (UTC parse fix)', async () => {
    const recentFailedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace('Z', '')
    const store = makeStore({ active: null, latest: { status: 'failed', updated_at: recentFailedAt } })
    expect(await createWithDedup(store, taskDef)).toBeNull()
  })

  test('still blocks active-state tasks via findTaskByTitle', async () => {
    for (const status of ['ready', 'in_progress', 'awaiting_merge', 'blocked', 'backlog']) {
      const store = makeStore({ active: { status } })
      expect(await createWithDedup(store, taskDef)).toBeNull()
    }
  })

  test('proceeds to create when no blocking condition met', async () => {
    const store = makeStore()
    expect(await createWithDedup(store, taskDef)).toBe('new-task-id')
  })
})
