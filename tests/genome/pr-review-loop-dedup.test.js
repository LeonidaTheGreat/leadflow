'use strict'

/**
 * Regression tests for PRReviewLoop 3 dedup bugs (task 73f2e7c5).
 *
 * Bug 1: Title-based dedup allowed duplicate fix tasks when QC issue summaries changed
 *        between heartbeats. Fix: _findActiveFixTaskForPR() queries by stable parent_task_id.
 *
 * Bug 2: changes_requested reviews for tasks already in active states (ready, in_progress,
 *        blocked, parked, cancelled) created redundant fix tasks. Fix: close review, no fix task.
 *
 * Bug 3: awaiting_merge QC rejection path had no retry cap — tasks reset indefinitely.
 *        Fix: park task when retry_count >= max_retries instead of resetting to ready.
 *
 * Run: cd ~/.openclaw/genome && npm test -- tests/pr-review-loop-dedup.test.js
 */

const GENOME_ROOT = '/Users/clawdbot/.openclaw/genome'

jest.mock('child_process', () => ({ execSync: jest.fn().mockReturnValue('') }))

jest.mock(`${GENOME_ROOT}/core/project-config-loader`, () => ({
  getProjectDir: () => '/tmp/test-project',
  getConfigForProject: () => ({ project_dir: '/tmp/test-project' }),
  getAllProjectIds: () => [],
  resolveStatePath: (f) => `/tmp/${f}`
}))

jest.mock(`${GENOME_ROOT}/core/workflow-engine`, () => ({
  createPRForTask: jest.fn(),
  escalateModel: jest.fn((m) => m),
  chainTask: jest.fn()
}))

jest.mock(`${GENOME_ROOT}/core/git-worktree`, () => ({
  rebaseInWorktree: jest.fn().mockReturnValue({ success: false, error: 'mock' })
}))

jest.mock(`${GENOME_ROOT}/intelligence/orchestrator-decision-tracker`, () => ({
  recordOutcome: jest.fn()
}))

jest.mock(`${GENOME_ROOT}/core/reflexes/stale-pr-close`, () => ({
  decide: jest.fn().mockReturnValue([])
}))

jest.mock(`${GENOME_ROOT}/core/sensors/pr-state`, () => ({
  sense: jest.fn().mockResolvedValue({ reviews: [] })
}))

const mockParkTask = jest.fn().mockResolvedValue(undefined)
const mockFailTask = jest.fn().mockResolvedValue(undefined)
const mockCancelTask = jest.fn().mockResolvedValue(undefined)
jest.mock(`${GENOME_ROOT}/core/actuators/task-transitions`, () => ({
  parkTask: (...args) => mockParkTask(...args),
  failTask: (...args) => mockFailTask(...args),
  cancelTask: (...args) => mockCancelTask(...args)
}))

const { PRReviewLoop } = require(`${GENOME_ROOT}/core/loops/pr-review-loop`)

function makeQueryChain(overrides = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockResolvedValue({ data: [], error: null }),
    in: jest.fn().mockResolvedValue({ data: overrides.inData || [], error: null }),
    limit: jest.fn().mockResolvedValue({ data: overrides.limitData || [], error: null })
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
    executor: { triggerDeployForUC: jest.fn(), taskHygiene: null }
  }
}

describe('PRReviewLoop dedup regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('Bug 1: existing fix task by parent_task_id prevents duplicate fix task creation', async () => {
    // Simulates two consecutive heartbeats where QC summaries differ between runs.
    // Old code: dedup by title → titles differ → creates second fix task → infinite loop.
    // Fixed:    dedup by parent_task_id → stable → found → no duplicate.
    const rejectedReview = {
      id: 'review-dup',
      pr_number: 200,
      branch_name: 'fix/some-work',
      task_id: 'task-original',
      review_notes: { issues: [{ summary: 'Missing tests in integration suite — run 2' }] }
    }
    const existingFixTask = {
      id: 'fix-task-prior',
      title: 'Dev Fix: Missing tests in integration suite — run 1',
      status: 'in_progress'
    }

    const store = {
      supabase: {},
      getCodeReviews: jest.fn(async (_, filter) => {
        if (filter?.status === 'approved') return []
        if (filter?.status === 'changes_requested') return [rejectedReview]
        return []
      }),
      getTask: jest.fn().mockResolvedValue({
        id: 'task-original', status: 'done', retry_count: 0, max_retries: 3
      }),
      updateTask: jest.fn().mockResolvedValue(undefined),
      updateCodeReview: jest.fn().mockResolvedValue(undefined),
      createTask: jest.fn().mockResolvedValue(undefined),
      // _findActiveFixTaskForPR queries parent_task_id → returns existingFixTask
      query: jest.fn(() => makeQueryChain({ limitData: [existingFixTask] }))
    }

    await new PRReviewLoop(makeParent(store)).checkPRReviews()

    // Duplicate must NOT be created
    expect(store.createTask).not.toHaveBeenCalled()
    // Review must be closed so it is not reprocessed next heartbeat
    expect(store.updateCodeReview).toHaveBeenCalledWith(rejectedReview.id, { status: 'closed' })
  })

  test('Bug 2: changes_requested for an already-active task closes review without new fix task', async () => {
    // Stale review: a previous heartbeat already reset the task to ready.
    // Old code: didn't check task status → created a fix task for an already-active task.
    // Fixed:    detects active status (ready/in_progress/blocked/parked/cancelled) → close review only.
    const rejectedReview = {
      id: 'review-stale',
      pr_number: 201,
      branch_name: 'fix/already-active',
      task_id: 'task-in-progress',
      review_notes: { issues: [{ summary: 'Timeout in API test' }] }
    }
    const activeTask = {
      id: 'task-in-progress',
      status: 'ready',
      retry_count: 1,
      max_retries: 3
    }

    const store = {
      supabase: {},
      getCodeReviews: jest.fn(async (_, filter) => {
        if (filter?.status === 'approved') return []
        if (filter?.status === 'changes_requested') return [rejectedReview]
        return []
      }),
      getTask: jest.fn().mockResolvedValue(activeTask),
      updateTask: jest.fn().mockResolvedValue(undefined),
      updateCodeReview: jest.fn().mockResolvedValue(undefined),
      createTask: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(() => makeQueryChain({ limitData: [] }))
    }

    await new PRReviewLoop(makeParent(store)).checkPRReviews()

    // No fix task for an already-active task
    expect(store.createTask).not.toHaveBeenCalled()
    // Stale review must be closed
    expect(store.updateCodeReview).toHaveBeenCalledWith(rejectedReview.id, { status: 'closed' })
  })

  test('Bug 3: awaiting_merge with retries exhausted parks task instead of infinite reset', async () => {
    // Old code: awaiting_merge path had no retry cap — closePR + reset to ready on every
    // QC rejection, indefinitely. This keeps the task oscillating forever.
    // Fixed:    when retry_count >= max_retries, park instead of reset.
    const rejectedReview = {
      id: 'review-exhausted',
      pr_number: 202,
      branch_name: 'fix/infinite-loop',
      task_id: 'task-awaiting',
      review_notes: { issues: [{ summary: 'Tests still failing after 3 QC rejections' }] }
    }
    const exhaustedTask = {
      id: 'task-awaiting',
      title: 'Implement payment webhook',
      status: 'awaiting_merge',
      retry_count: 3,
      max_retries: 3
    }

    const store = {
      supabase: {},
      getCodeReviews: jest.fn(async (_, filter) => {
        if (filter?.status === 'approved') return []
        if (filter?.status === 'changes_requested') return [rejectedReview]
        return []
      }),
      getTask: jest.fn().mockResolvedValue(exhaustedTask),
      updateTask: jest.fn().mockResolvedValue(undefined),
      updateCodeReview: jest.fn().mockResolvedValue(undefined),
      createTask: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(() => makeQueryChain({ limitData: [] }))
    }

    await new PRReviewLoop(makeParent(store)).checkPRReviews()

    // Must NOT reset to ready — that's the infinite loop
    const resetCalls = store.updateTask.mock.calls.filter(
      ([id, upd]) => id === exhaustedTask.id && upd.status === 'ready'
    )
    expect(resetCalls).toHaveLength(0)

    // Must park the task
    expect(mockParkTask).toHaveBeenCalledWith(
      store,
      exhaustedTask.id,
      expect.objectContaining({ reason: expect.stringContaining('QC rejected') })
    )
  })
})
