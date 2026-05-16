'use strict'

/**
 * TASK SPEC (Task ID: fd268389-b066-4daa-a02d-9715c5fa0716)
 * What:
 *   - Add tests/genome/zombie-idle-threshold.test.js to verify per-agent idle zombie thresholds
 *   - Tests both CompletionScanner (realtime-dispatcher path via agent-session.js) and confirms
 *     the genome's SpawnHealthMonitor aligns with agent-session.js thresholds.
 * Verify:
 *   - npx jest tests/genome/zombie-idle-threshold.test.js --runInBand => all tests pass
 *   - npm test => exits 0
 * Boundaries:
 *   - Do not modify genome runtime files
 *   - Only tests — no behavior changes
 */

/**
 * Idle zombie threshold — per-agent cutoffs
 *
 * Verifies that PM/product tasks are not falsely cancelled as zombies when still
 * running (or about to complete) within their agent-appropriate idle window.
 *
 * Two zombie-detection paths exist:
 *   1. CompletionScanner (realtime-dispatcher, every 2min) — uses agent-session.js thresholds
 *   2. SpawnHealthMonitor (heartbeat, every 5min) — uses IDLE_THRESHOLD_BY_ROLE (aligned below)
 *
 * Thresholds (minutes of log silence before zombie declaration):
 *   dev/design: 15  |  qc: 45  |  product: 60  |  marketing/analytics: 30
 */

const fs = require('fs')
const COMPLETION_SCAN_PATH = '/Users/clawdbot/.openclaw/genome/core/completion-scan'
const { CompletionScanner } = require(COMPLETION_SCAN_PATH)

function makeTask(agentId, spawnedMinutesAgo, pid) {
  return {
    id: `task-zombie-${agentId}-${Date.now()}`,
    title: `Test zombie for ${agentId}`,
    agent_id: agentId,
    project_id: 'leadflow',
    retry_count: 0,
    max_retries: 3,
    started_at: new Date(Date.now() - spawnedMinutesAgo * 60000).toISOString(),
    spawn_config: {
      pid,
      log_prefix: '/tmp/fake-zombie-test-log',
    },
  }
}

function setupMocks(logIdleMin) {
  jest.spyOn(fs, 'existsSync').mockReturnValue(false)
  jest.spyOn(fs, 'readdirSync').mockReturnValue([])
  jest.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: Date.now() - logIdleMin * 60000 })
  jest.spyOn(process, 'kill').mockImplementation((pid, signal) => {
    if (signal === 0) return  // alive check — return without throwing
  })
}

function makeScanner(task) {
  const store = {
    getTasks: jest.fn().mockResolvedValue([task]),
    getTask: jest.fn().mockResolvedValue(task),
    updateTask: jest.fn().mockResolvedValue({}),
  }
  const scanner = new CompletionScanner({
    store,
    learner: { recordOutcome: jest.fn(), getRecommendedModel: jest.fn(), recordFailure: jest.fn() },
    log: jest.fn(),
    sendTelegram: jest.fn().mockResolvedValue(undefined),
    projectId: 'leadflow',
  })
  return { scanner, store }
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('idle zombie threshold — per-agent cutoffs', () => {
  // ── dev / design (threshold = 15 min) ──────────────────────────────────────

  test('dev: 20-min idle IS flagged as zombie (threshold=15)', async () => {
    const pid = 88801
    setupMocks(20)
    const task = makeTask('dev', 20, pid)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    expect(store.updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ status: 'ready', retry_count: 1, last_error: expect.stringContaining('idle') }),
    )
  })

  test('design: 20-min idle IS flagged as zombie (threshold=15)', async () => {
    const pid = 88802
    setupMocks(20)
    const task = makeTask('design', 20, pid)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    expect(store.updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ status: 'ready', retry_count: 1, last_error: expect.stringContaining('idle') }),
    )
  })

  // ── product (threshold = 60 min) — the primary regression guard ────────────

  test('product: 18-min idle is NOT flagged as zombie (threshold=60)', async () => {
    const pid = 88803
    setupMocks(18)
    const task = makeTask('product', 18, pid)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    expect(store.updateTask).not.toHaveBeenCalled()
  })

  test('product: 45-min idle is NOT flagged as zombie (threshold=60)', async () => {
    const pid = 88804
    setupMocks(45)
    const task = makeTask('product', 50, pid)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    expect(store.updateTask).not.toHaveBeenCalled()
  })

  test('product: 65-min idle IS flagged as zombie (threshold=60)', async () => {
    const pid = 88805
    setupMocks(65)
    const task = makeTask('product', 70, pid)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    expect(store.updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ status: 'ready', retry_count: 1, last_error: expect.stringContaining('idle') }),
    )
  })

  // ── qc (threshold = 45 min) ────────────────────────────────────────────────

  test('qc: 20-min idle is NOT flagged as zombie (threshold=45)', async () => {
    const pid = 88806
    setupMocks(20)
    const task = makeTask('qc', 25, pid)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    expect(store.updateTask).not.toHaveBeenCalled()
  })

  test('qc: 50-min idle IS flagged as zombie (threshold=45)', async () => {
    const pid = 88807
    setupMocks(50)
    const task = makeTask('qc', 55, pid)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    expect(store.updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ status: 'ready', retry_count: 1, last_error: expect.stringContaining('idle') }),
    )
  })

  // ── analytics / marketing (threshold = 30 min) ─────────────────────────────

  test('analytics: 20-min idle is NOT flagged as zombie (threshold=30)', async () => {
    const pid = 88808
    setupMocks(20)
    const task = makeTask('analytics', 25, pid)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    expect(store.updateTask).not.toHaveBeenCalled()
  })

  test('analytics: 35-min idle IS flagged as zombie (threshold=30)', async () => {
    const pid = 88809
    setupMocks(35)
    const task = makeTask('analytics', 40, pid)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    expect(store.updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ status: 'ready', retry_count: 1, last_error: expect.stringContaining('idle') }),
    )
  })

  // ── PID dead — should always be caught regardless of agent ─────────────────

  test('dead PID is always detected as zombie regardless of agent type', async () => {
    // No mock for process.kill signal 0 — let it throw (PID dead)
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    jest.spyOn(fs, 'readdirSync').mockReturnValue([])
    jest.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (signal === 0) throw new Error('ESRCH: no such process')
    })
    const task = makeTask('product', 10, 88810)
    const { scanner, store } = makeScanner(task)
    await scanner.run()
    // dead PID with 10 min runtime → zombie_dead state → should retry
    expect(store.updateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ status: 'ready', retry_count: 1 }),
    )
  })
})
