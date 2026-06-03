'use strict'

/**
 * tests/genome/auto-recovery-rate.test.js
 *
 * Regression guard for Auto-Recovery Rate metric — UC-level calculation.
 *
 * Bug: The old task-level metric (everFailed/selfHealed) missed rescue-task
 * recovery. When a UC's original task failed and a rescue task was created,
 * the rescue task might complete (done, retry_count=0) while the original
 * stays failed. The old metric counted selfHealed = doneTasks with retry_count>0
 * — rescue tasks have retry_count=0 so the UC appeared unrecovered even though
 * it reached implementation_status='complete'.
 *
 * Fix (genome branch dev/ed09564f-fix-auto-recovery-rate-metric-to-use-uc):
 * UC-level metric — a UC "auto-recovered" if it had ≥1 failed task AND reached
 * implementation_status='complete'. Falls back to task-level rate when no
 * UC-linked failures exist (orphan/fix tasks).
 *
 * Run from genome directory: cd ~/projects/genome && npm test
 */

jest.mock('dotenv', () => ({ config: jest.fn() }))
jest.mock('/Users/clawdbot/.openclaw/genome/core/project-config-loader', () => {
  const path = require('path')
  const os = require('os')
  const stateDir = path.join(os.tmpdir(), 'auto-recovery-test-state', 'genome')
  return {
    getConfig: () => ({ project_id: 'genome' }),
    resolveStatePath: (f) => path.join(stateDir, f),
    getDayNumber: () => 1,
    clearCache: jest.fn()
  }
})

const { MissionMetricCollector } = require('/Users/clawdbot/.openclaw/genome/core/mission-metric-collector')

/**
 * Minimal store mock for Auto-Recovery Rate tests.
 * - tasks call #1: allTasks (7-day window, includes use_case_id)
 * - tasks call #2+: empty (recentTasks for duplicate detection + UC chain tasks)
 * - use_cases (any call): ucData
 * - other tables: empty
 */
function makeStore(tasks, ucData) {
  let taskCallCount = 0
  return {
    getMissionMetrics: jest.fn().mockResolvedValue([
      { name: 'Auto-Recovery Rate', collection_method: 'genome_metrics' }
    ]),
    updateMetricValue: jest.fn().mockResolvedValue(true),
    getMetrics: jest.fn().mockResolvedValue([]),
    query: jest.fn().mockImplementation((table) => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis()
      }
      if (table === 'tasks') {
        taskCallCount++
        const data = taskCallCount === 1 ? tasks : []
        builder.then = (res) => res({ data, error: null })
      } else if (table === 'use_cases') {
        builder.then = (res) => res({ data: ucData, error: null })
      } else {
        builder.then = (res) => res({ data: [], error: null })
      }
      return builder
    })
  }
}

function makeTask(overrides) {
  return {
    id: overrides.id || 't1',
    status: overrides.status || 'done',
    use_case_id: overrides.use_case_id !== undefined ? overrides.use_case_id : null,
    retry_count: overrides.retry_count !== undefined ? overrides.retry_count : 0,
    created_at: '2026-04-15T10:00:00Z',
    updated_at: '2026-04-15T12:00:00Z',
    tags: null,
    title: overrides.title || 'Test task'
  }
}

describe('Auto-Recovery Rate: UC-level calculation (regression guard)', () => {
  // ── Core UC-level behavior ────────────────────────────────────────────────

  test('UC with failed task + complete status → 100% recovered', async () => {
    const tasks = [makeTask({ id: 't1', status: 'failed', use_case_id: 'uc-1' })]
    const ucData = [{ id: 'uc-1', implementation_status: 'complete' }]
    const store = makeStore(tasks, ucData)
    const collector = new MissionMetricCollector(store)
    await collector.collect('genome')
    expect(store.updateMetricValue).toHaveBeenCalledWith('genome', 'Auto-Recovery Rate', 100)
  })

  test('UC with failed task + stuck status → 0% recovered', async () => {
    const tasks = [makeTask({ id: 't1', status: 'failed', use_case_id: 'uc-1' })]
    const ucData = [{ id: 'uc-1', implementation_status: 'stuck' }]
    const store = makeStore(tasks, ucData)
    const collector = new MissionMetricCollector(store)
    await collector.collect('genome')
    expect(store.updateMetricValue).toHaveBeenCalledWith('genome', 'Auto-Recovery Rate', 0)
  })

  test('rescue-task pattern: original failed (retry_count=0), rescue done (retry_count=0), UC complete → 100%', async () => {
    // KEY REGRESSION: old task-level metric returned 0% here because selfHealed
    // only counted done tasks with retry_count>0. The rescue task has retry_count=0
    // (it's a fresh task, not a retry of the original), so the UC appeared unrecovered
    // even though implementation_status='complete'.
    const tasks = [
      makeTask({ id: 't1', status: 'failed', use_case_id: 'uc-1', retry_count: 0 }), // original
      makeTask({ id: 't2', status: 'done',   use_case_id: 'uc-1', retry_count: 0 })  // rescue
    ]
    const ucData = [{ id: 'uc-1', implementation_status: 'complete' }]
    const store = makeStore(tasks, ucData)
    const collector = new MissionMetricCollector(store)
    await collector.collect('genome')
    expect(store.updateMetricValue).toHaveBeenCalledWith('genome', 'Auto-Recovery Rate', 100)
  })

  test('1 of 2 UCs recovered → 50%', async () => {
    const tasks = [
      makeTask({ id: 't1', status: 'failed', use_case_id: 'uc-1' }),
      makeTask({ id: 't2', status: 'failed', use_case_id: 'uc-2' })
    ]
    const ucData = [
      { id: 'uc-1', implementation_status: 'complete' },
      { id: 'uc-2', implementation_status: 'stuck' }
    ]
    const store = makeStore(tasks, ucData)
    const collector = new MissionMetricCollector(store)
    await collector.collect('genome')
    expect(store.updateMetricValue).toHaveBeenCalledWith('genome', 'Auto-Recovery Rate', 50)
  })

  test('multiple failed tasks for same UC → UC counted once, not per task', async () => {
    // 3 failed tasks all on the same UC → denominator is 1 (UCs), not 3 (tasks)
    const tasks = [
      makeTask({ id: 't1', status: 'failed', use_case_id: 'uc-1' }),
      makeTask({ id: 't2', status: 'failed', use_case_id: 'uc-1' }),
      makeTask({ id: 't3', status: 'failed', use_case_id: 'uc-1' })
    ]
    const ucData = [{ id: 'uc-1', implementation_status: 'complete' }]
    const store = makeStore(tasks, ucData)
    const collector = new MissionMetricCollector(store)
    await collector.collect('genome')
    // 1 recovered UC / 1 unique UC = 100% (not 1/3 = 33%)
    expect(store.updateMetricValue).toHaveBeenCalledWith('genome', 'Auto-Recovery Rate', 100)
  })

  // ── Fallback to task-level rate ───────────────────────────────────────────

  test('no UC-linked failures → task-level fallback: orphan failed task = 0%', async () => {
    const tasks = [makeTask({ id: 't1', status: 'failed', use_case_id: null })]
    const store = makeStore(tasks, [])
    const collector = new MissionMetricCollector(store)
    await collector.collect('genome')
    // Task-level: 0 healed / 1 ever-failed = 0%
    expect(store.updateMetricValue).toHaveBeenCalledWith('genome', 'Auto-Recovery Rate', 0)
  })

  test('no UC-linked failures → task-level fallback: retried+done task = 100%', async () => {
    const tasks = [makeTask({ id: 't1', status: 'done', use_case_id: null, retry_count: 1 })]
    const store = makeStore(tasks, [])
    const collector = new MissionMetricCollector(store)
    await collector.collect('genome')
    // Task-level: 1 healed (done+retry_count>0) / 1 ever-failed = 100%
    expect(store.updateMetricValue).toHaveBeenCalledWith('genome', 'Auto-Recovery Rate', 100)
  })

  test('no tasks at all → metric skipped (null, not updated)', async () => {
    const store = makeStore([], [])
    const collector = new MissionMetricCollector(store)
    await collector.collect('genome')
    expect(store.updateMetricValue).not.toHaveBeenCalledWith('genome', 'Auto-Recovery Rate', expect.anything())
  })
})
