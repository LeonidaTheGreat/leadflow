'use strict'
/**
 * tests/genome/merge-backlog-alert.test.js
 *
 * Unit tests for QCLoop.checkMergeBacklog() — the merge backlog alert feature.
 *
 * Tests verify:
 *   1. No alert when awaiting_merge count is at or below threshold (15)
 *   2. Alert fires + tasks accelerated when count > 15
 *   3. Cooldown suppresses repeat alerts within 2h
 *   4. Cooldown resets after 2h and alert fires again
 *   5. DB query error is swallowed (non-fatal)
 *   6. Dry-run skips Telegram send and DB writes
 *
 * We test checkMergeBacklog() in isolation by constructing a minimal QCLoop
 * with mocked store, config, and fs. No HeartbeatExecutor is instantiated.
 */

const path = require('path')
const os = require('os')
const QC_LOOP_PATH = path.join(os.homedir(), '.openclaw/genome/core/loops/qc-loop')
const CONFIG_LOADER_PATH = path.join(os.homedir(), '.openclaw/genome/core/project-config-loader')
const PARSE_UTC_PATH = path.join(os.homedir(), '.openclaw/genome/core/parse-utc')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTasks(count, olderThan = 0) {
  return Array.from({ length: count }, (_, i) => ({
    id: `task-${i}`,
    title: `Task ${i}`,
    pr_number: 1000 + i,
    updated_at: new Date(Date.now() - olderThan - i * 60000).toISOString(),
    branch_name: `dev/branch-${i}`,
    project_id: 'leadflow'
  }))
}

function makeQueryResult(tasks) {
  // Mimic supabase query builder chain
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: tasks, error: null })
  }
  return builder
}

function makeStore(tasks = []) {
  return {
    supabase: {}, // truthy — indicates DB connection exists
    query: jest.fn(() => makeQueryResult(tasks)),
    updateTask: jest.fn().mockResolvedValue({})
  }
}

/**
 * Build a minimal QCLoop-like object that exposes only what checkMergeBacklog() uses.
 * This avoids the full HeartbeatExecutor constructor (which connects to Supabase/DB).
 */
function makeQCLoopInstance({ tasks = [], dryRun = false, stateFileContent = null } = {}) {
  const store = makeStore(tasks)
  const config = {
    telegram: { chat_id: '-1003852328909', thread_id: '10788' }
  }

  // Mock resolveStatePath to use a temp path
  const stateFilePath = path.join(os.tmpdir(), `.merge-backlog-alert-test-${Date.now()}.json`)
  const fsMock = {
    existsSync: jest.fn().mockReturnValue(stateFileContent !== null),
    readFileSync: jest.fn().mockReturnValue(
      stateFileContent !== null ? JSON.stringify(stateFileContent) : '{}'
    ),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn()
  }

  // Minimal executor proxy
  const executor = {
    store,
    config,
    actions: [],
    errors: [],
    projectId: 'leadflow',
    dryRun,
    _dryRunWouldSend: []
  }

  // Build the instance using the actual QCLoop class but with mocked deps
  jest.resetModules()
  jest.doMock(CONFIG_LOADER_PATH, () => ({
    getProjectDir: jest.fn().mockReturnValue('/tmp/leadflow'),
    resolveStatePath: jest.fn().mockReturnValue(stateFilePath),
    getConfigForProject: jest.fn().mockReturnValue(null),
    getConfig: jest.fn().mockReturnValue(config)
  }))
  jest.doMock('fs', () => fsMock)
  // build-health and PRReviewLoop are not under test — stub them
  jest.doMock(path.join(os.homedir(), '.openclaw/genome/health/build-health'), () => ({
    checkBuildHealth: jest.fn().mockResolvedValue({ pass: true })
  }))
  jest.doMock(path.join(os.homedir(), '.openclaw/genome/core/loops/pr-review-loop'), () => ({
    PRReviewLoop: jest.fn(() => ({}))
  }))
  jest.doMock(path.join(os.homedir(), '.openclaw/genome/core/food/git-checkout-safe'), () => ({
    safeCheckoutMain: jest.fn()
  }))
  jest.doMock(path.join(os.homedir(), '.openclaw/genome/core/loops/qc-loop-quality'), () => () => {})

  const QCLoop = require(QC_LOOP_PATH)
  const instance = new QCLoop(executor)

  return { instance, store, executor, fsMock }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.resetModules()
})

describe('QCLoop.checkMergeBacklog()', () => {
  test('does NOT alert when count is at or below threshold (15)', async () => {
    const tasks = makeTasks(15, 2 * 60 * 60 * 1000)
    const { instance, store, executor } = makeQCLoopInstance({ tasks })

    await instance.checkMergeBacklog()

    // No Telegram send attempted — no https.request should have been called
    // (verified by checking actions is empty and store.updateTask not called)
    expect(store.updateTask).not.toHaveBeenCalled()
    expect(executor.actions).toHaveLength(0)
  })

  test('alerts and accelerates oldest tasks when count > 15', async () => {
    const tasks = makeTasks(23, 3 * 60 * 60 * 1000) // 23 tasks, 3h+ old
    const { instance, store, executor, fsMock } = makeQCLoopInstance({
      tasks,
      stateFileContent: null // no prior alert
    })

    // Mock https.request to avoid real network call
    const mockReq = {
      on: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      write: jest.fn(),
      end: jest.fn()
    }
    const https = require('https')
    jest.spyOn(https, 'request').mockImplementation((opts, cb) => {
      // Simulate a successful response
      const res = {
        statusCode: 200,
        on: jest.fn((event, handler) => {
          if (event === 'end') handler()
        })
      }
      cb(res)
      return mockReq
    })

    await instance.checkMergeBacklog()

    // Alert was pushed to actions
    expect(executor.actions).toHaveLength(1)
    expect(executor.actions[0]).toMatch(/merge backlog alert/i)
    expect(executor.actions[0]).toMatch('23')

    // 5 oldest tasks should have been accelerated (last_spawned_at = null)
    expect(store.updateTask).toHaveBeenCalledTimes(5)
    for (let i = 0; i < 5; i++) {
      expect(store.updateTask).toHaveBeenCalledWith(tasks[i].id, { last_spawned_at: null })
    }

    // State file should be written with lastAlertAt
    expect(fsMock.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"lastAlertAt"')
    )
  })

  test('suppresses alert when last alert was within 2h cooldown', async () => {
    const tasks = makeTasks(20, 60 * 60 * 1000)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { instance, store, executor, fsMock } = makeQCLoopInstance({
      tasks,
      stateFileContent: { lastAlertAt: oneHourAgo, count: 20 }
    })

    await instance.checkMergeBacklog()

    // No acceleration, no action pushed (cooldown suppressed)
    expect(store.updateTask).not.toHaveBeenCalled()
    expect(executor.actions).toHaveLength(0)
  })

  test('fires again after cooldown expires (> 2h since last alert)', async () => {
    const tasks = makeTasks(18, 60 * 60 * 1000)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    const { instance, store, executor } = makeQCLoopInstance({
      tasks,
      stateFileContent: { lastAlertAt: threeHoursAgo, count: 16 }
    })

    const https = require('https')
    const mockReq = {
      on: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      write: jest.fn(),
      end: jest.fn()
    }
    jest.spyOn(https, 'request').mockImplementation((opts, cb) => {
      const res = { statusCode: 200, on: jest.fn((e, h) => { if (e === 'end') h() }) }
      cb(res)
      return mockReq
    })

    await instance.checkMergeBacklog()

    // Alert should fire after cooldown expired
    expect(executor.actions).toHaveLength(1)
    expect(executor.actions[0]).toMatch(/18/)
    expect(store.updateTask).toHaveBeenCalledTimes(5)
  })

  test('skips Telegram send and DB writes in dry-run mode', async () => {
    const tasks = makeTasks(20, 2 * 60 * 60 * 1000)
    const { instance, store, executor } = makeQCLoopInstance({
      tasks,
      dryRun: true,
      stateFileContent: null
    })

    const https = require('https')
    const requestSpy = jest.spyOn(https, 'request')

    await instance.checkMergeBacklog()

    // In dry-run: no real https.request
    expect(requestSpy).not.toHaveBeenCalled()
    // In dry-run: no actual DB writes for acceleration
    expect(store.updateTask).not.toHaveBeenCalled()
    // But action is still pushed to keep the record
    expect(executor.actions).toHaveLength(1)
    expect(executor.actions[0]).toMatch(/merge backlog alert/i)
  })

  test('swallows DB query error non-fatally', async () => {
    const store = {
      supabase: {},
      query: jest.fn(() => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'connection refused' } })
        }
        return builder
      }),
      updateTask: jest.fn()
    }

    jest.resetModules()
    jest.doMock(CONFIG_LOADER_PATH, () => ({
      getProjectDir: jest.fn().mockReturnValue('/tmp/leadflow'),
      resolveStatePath: jest.fn().mockReturnValue('/tmp/.test-merge-state.json'),
      getConfigForProject: jest.fn().mockReturnValue(null),
      getConfig: jest.fn().mockReturnValue({ telegram: {} })
    }))
    jest.doMock('fs', () => ({
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn(),
      writeFileSync: jest.fn(),
      mkdirSync: jest.fn()
    }))
    jest.doMock(path.join(os.homedir(), '.openclaw/genome/health/build-health'), () => ({
      checkBuildHealth: jest.fn().mockResolvedValue({ pass: true })
    }))
    jest.doMock(path.join(os.homedir(), '.openclaw/genome/core/loops/pr-review-loop'), () => ({
      PRReviewLoop: jest.fn(() => ({}))
    }))
    jest.doMock(path.join(os.homedir(), '.openclaw/genome/core/food/git-checkout-safe'), () => ({
      safeCheckoutMain: jest.fn()
    }))
    jest.doMock(path.join(os.homedir(), '.openclaw/genome/core/loops/qc-loop-quality'), () => () => {})

    const QCLoop = require(QC_LOOP_PATH)
    const executor = {
      store,
      config: { telegram: { chat_id: '-1003852328909', thread_id: '10788' } },
      actions: [], errors: [], projectId: 'leadflow', dryRun: false, _dryRunWouldSend: []
    }
    const instance = new QCLoop(executor)

    // Should not throw
    await expect(instance.checkMergeBacklog()).resolves.toBeUndefined()

    // No acceleration or alert since the query reported an error
    expect(store.updateTask).not.toHaveBeenCalled()
    expect(executor.actions).toHaveLength(0)
  })

  test('skips check when no DB connection', async () => {
    const tasks = makeTasks(20)
    const { instance, store, executor } = makeQCLoopInstance({ tasks })
    // Simulate no DB
    store.supabase = null

    await instance.checkMergeBacklog()

    expect(store.query).not.toHaveBeenCalled()
    expect(executor.actions).toHaveLength(0)
  })
})
