'use strict'
/**
 * Regression tests for 3 dedup bugs in PRReviewLoop.checkPRReviews()
 * that caused an infinite QC rejection fix-task loop.
 *
 * Bug 1: Title-based dedup failed because issue summaries change between QC
 *   runs. Fixed by _findActiveFixTaskForPR() which uses stable parent_task_id.
 *
 * Bug 2: A stale changes_requested review pointing at an active task (ready/
 *   in_progress/blocked/parked) created a duplicate fix task instead of
 *   just closing the stale review.
 *
 * Bug 3: The awaiting_merge reset path had no retry cap. QC could reject and
 *   reset a task indefinitely. Fixed by parking tasks once retry_count >= max_retries.
 */

jest.mock('child_process', () => ({ execSync: jest.fn().mockReturnValue('') }))
jest.mock('/Users/clawdbot/.openclaw/genome/core/project-config-loader', () => ({
  getProjectDir: () => '/tmp/test-project',
  getConfigForProject: () => ({ project_dir: '/tmp/test-project' }),
  resolveStatePath: (f) => `/tmp/${f}`
}))
jest.mock('/Users/clawdbot/.openclaw/genome/core/workflow-engine', () => ({
  createPRForTask: jest.fn().mockResolvedValue(null),
  escalateModel: jest.fn(m => m)
}))
jest.mock('/Users/clawdbot/.openclaw/genome/intelligence/orchestrator-decision-tracker', () => ({
  recordOutcome: jest.fn()
}))
jest.mock('/Users/clawdbot/.openclaw/genome/core/sensors/pr-state', () => ({
  sense: jest.fn().mockResolvedValue({ openPRs: [], codeReviews: [], tasks: [] })
}))
jest.mock('/Users/clawdbot/.openclaw/genome/core/reflexes/stale-pr-close', () => ({
  decide: jest.fn().mockReturnValue([])
}))
jest.mock('/Users/clawdbot/.openclaw/genome/core/actuators/task-transitions', () => ({
  failTask: jest.fn(),
  cancelTask: jest.fn(),
  parkTask: jest.fn()
}))

const { PRReviewLoop } = require('/Users/clawdbot/.openclaw/genome/core/loops/pr-review-loop')
const { parkTask } = require('/Users/clawdbot/.openclaw/genome/core/actuators/task-transitions')

function makeQueryChain(results = []) {
  let callCount = 0
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    limit: jest.fn(() => {
      const res = results[callCount] !== undefined ? results[callCount] : { data: [] }
      callCount++
      return Promise.resolve(res)
    })
  }
  return chain
}

function makeParent(store) {
  return {
    store,
    actions: [],
    errors: [],
    config: {},
    projectId: 'leadflow',
    learner: { recordFailure: jest.fn(), recordQCFindings: jest.fn() },
    dryRun: false,
    _dryRunWouldSend: [],
    _mainCIPasses: true,
    _deployedTargets: new Set(),
    executor: { triggerDeployForUC: jest.fn() }
  }
}

describe('PRReviewLoop dedup regressions', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── Bug 1: parent_task_id dedup ──────────────────────────────────────────────

  test('Bug 1: closes review without new fix task when active fix task already exists for parent', async () => {
    const review = {
      id: 'rev-1', pr_number: 100, branch_name: 'fix/thing', task_id: 'orig-task-id',
      review_notes: { issues: [{ summary: 'A QC issue' }] }
    }
    const existingFix = { id: 'fix-task-id', title: 'Dev Fix: A QC issue', status: 'ready' }

    const store = {
      supabase: {},
      getCodeReviews: jest.fn(async (_pid, filter) => {
        if (filter?.status === 'changes_requested') return [review]
        return []
      }),
      getTask: jest.fn().mockResolvedValue(null),
      updateTask: jest.fn().mockResolvedValue(undefined),
      updateCodeReview: jest.fn().mockResolvedValue(undefined),
      createTask: jest.fn().mockResolvedValue(undefined),
      findTaskByTitle: jest.fn().mockResolvedValue(null),
      findLatestTaskByTitle: jest.fn().mockResolvedValue(null),
      // _findActiveFixTaskForPR uses store.query — return the existing fix task
      query: jest.fn(() => makeQueryChain([{ data: [existingFix] }]))
    }

    const loop = new PRReviewLoop(makeParent(store))
    await loop.checkPRReviews()

    expect(store.updateCodeReview).toHaveBeenCalledWith('rev-1', expect.objectContaining({ status: 'closed' }))
    expect(store.createTask).not.toHaveBeenCalled()
  })

  test('Bug 1: _findActiveFixTaskForPR method exists on PRReviewLoop', () => {
    const loop = new PRReviewLoop(makeParent({ query: jest.fn(() => makeQueryChain()) }))
    expect(typeof loop._findActiveFixTaskForPR).toBe('function')
  })

  // ── Bug 2: stale changes_requested for active tasks ──────────────────────────

  test('Bug 2: closes stale review for ready task without creating a fix task', async () => {
    const review = {
      id: 'rev-stale', pr_number: 101, branch_name: 'fix/stale', task_id: 'active-task-id',
      review_notes: { issues: [{ summary: 'Old issue' }] }
    }
    const activeTask = {
      id: 'active-task-id', title: 'Dev: something', status: 'ready', retry_count: 0, max_retries: 3
    }

    const store = {
      supabase: {},
      getCodeReviews: jest.fn(async (_pid, filter) => {
        if (filter?.status === 'changes_requested') return [review]
        return []
      }),
      getTask: jest.fn().mockResolvedValue(activeTask),
      updateTask: jest.fn().mockResolvedValue(undefined),
      updateCodeReview: jest.fn().mockResolvedValue(undefined),
      createTask: jest.fn().mockResolvedValue(undefined),
      findTaskByTitle: jest.fn().mockResolvedValue(null),
      findLatestTaskByTitle: jest.fn().mockResolvedValue(null),
      query: jest.fn(() => makeQueryChain([{ data: [] }])) // no active fix task
    }

    const loop = new PRReviewLoop(makeParent(store))
    await loop.checkPRReviews()

    expect(store.updateCodeReview).toHaveBeenCalledWith('rev-stale', expect.objectContaining({ status: 'closed' }))
    expect(store.createTask).not.toHaveBeenCalled()
    expect(store.updateTask).not.toHaveBeenCalledWith('active-task-id', expect.objectContaining({ status: 'ready' }))
  })

  test('Bug 2: all active statuses (in_progress, blocked, parked) suppress fix task creation', async () => {
    for (const status of ['in_progress', 'blocked', 'parked']) {
      jest.clearAllMocks()
      const review = {
        id: `rev-${status}`, pr_number: 200, branch_name: 'fix/branch', task_id: 'active-id',
        review_notes: { issues: [{ summary: 'issue' }] }
      }

      const store = {
        supabase: {},
        getCodeReviews: jest.fn(async (_pid, filter) => {
          if (filter?.status === 'changes_requested') return [review]
          return []
        }),
        getTask: jest.fn().mockResolvedValue({ id: 'active-id', title: 'Task', status, retry_count: 0, max_retries: 3 }),
        updateTask: jest.fn().mockResolvedValue(undefined),
        updateCodeReview: jest.fn().mockResolvedValue(undefined),
        createTask: jest.fn().mockResolvedValue(undefined),
        findTaskByTitle: jest.fn().mockResolvedValue(null),
        findLatestTaskByTitle: jest.fn().mockResolvedValue(null),
        query: jest.fn(() => makeQueryChain([{ data: [] }]))
      }

      const loop = new PRReviewLoop(makeParent(store))
      await loop.checkPRReviews()

      expect(store.createTask).not.toHaveBeenCalled()
    }
  })

  // ── Bug 3: awaiting_merge retry cap ──────────────────────────────────────────

  test('Bug 3: parks awaiting_merge task when retry_count >= max_retries', async () => {
    const review = {
      id: 'rev-exhausted', pr_number: 102, branch_name: 'fix/exhausted', task_id: 'exhausted-task',
      review_notes: { issues: [{ summary: 'Still broken' }] }
    }
    const origTask = {
      id: 'exhausted-task', title: 'Fix: complex feature', status: 'awaiting_merge',
      retry_count: 3, max_retries: 3
    }

    const store = {
      supabase: {},
      getCodeReviews: jest.fn(async (_pid, filter) => {
        if (filter?.status === 'changes_requested') return [review]
        return []
      }),
      getTask: jest.fn().mockResolvedValue(origTask),
      updateTask: jest.fn().mockResolvedValue(undefined),
      updateCodeReview: jest.fn().mockResolvedValue(undefined),
      createTask: jest.fn().mockResolvedValue(undefined),
      findTaskByTitle: jest.fn().mockResolvedValue(null),
      findLatestTaskByTitle: jest.fn().mockResolvedValue(null),
      query: jest.fn(() => makeQueryChain([{ data: [] }]))
    }

    const loop = new PRReviewLoop(makeParent(store))
    await loop.checkPRReviews()

    expect(parkTask).toHaveBeenCalledWith(store, 'exhausted-task', expect.objectContaining({
      reason: expect.stringContaining('QC rejected')
    }))
    expect(store.createTask).not.toHaveBeenCalled()
  })

  test('Bug 3: does NOT park awaiting_merge task when retries remaining', async () => {
    const review = {
      id: 'rev-retry', pr_number: 103, branch_name: 'fix/retry', task_id: 'retry-task',
      review_notes: { issues: [{ summary: 'Still an issue' }] }
    }
    const origTask = {
      id: 'retry-task', title: 'Fix: something', status: 'awaiting_merge',
      retry_count: 1, max_retries: 3
    }

    const store = {
      supabase: {},
      getCodeReviews: jest.fn(async (_pid, filter) => {
        if (filter?.status === 'changes_requested') return [review]
        return []
      }),
      getTask: jest.fn().mockResolvedValue(origTask),
      updateTask: jest.fn().mockResolvedValue(undefined),
      updateCodeReview: jest.fn().mockResolvedValue(undefined),
      createTask: jest.fn().mockResolvedValue(undefined),
      findTaskByTitle: jest.fn().mockResolvedValue(null),
      findLatestTaskByTitle: jest.fn().mockResolvedValue(null),
      query: jest.fn(() => makeQueryChain([{ data: [] }]))
    }

    const loop = new PRReviewLoop(makeParent(store))
    await loop.checkPRReviews()

    expect(parkTask).not.toHaveBeenCalled()
    expect(store.createTask).not.toHaveBeenCalled()
    expect(store.updateTask).toHaveBeenCalledWith('retry-task', expect.objectContaining({ status: 'ready' }))
  })
})
