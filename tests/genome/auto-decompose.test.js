'use strict'

/**
 * Task Spec (fb1b2781-f2bc-4577-bb48-41c7657a532c)
 * What:
 * - Add tests in tests/genome/auto-decompose.test.js for exported functions in
 *   /Users/clawdbot/.openclaw/genome/intelligence/auto-decompose.js:
 *   checkTaskForDecomposition, generateSubtasks, autoDecompose, processAllReadyTasks.
 * Verify:
 * - Run: npx jest tests/genome/auto-decompose.test.js --runInBand
 *   Expected: all tests pass.
 * - Quality gates: npm run build, npm run lint, npm test, npm audit --audit-level=high
 *   Expected: exit code 0.
 * Boundaries:
 * - Do not modify any files under ~/.openclaw/genome.
 * - Do not change service/router/business logic in this repo.
 * - Only add/adjust tests for auto-decompose coverage.
 */

const AUTO_DECOMPOSE_PATH = '/Users/clawdbot/.openclaw/genome/intelligence/auto-decompose'
const TASK_STORE_PATH = '/Users/clawdbot/.openclaw/genome/core/task-store'
const PREDICTIVE_ENGINE_PATH = '/Users/clawdbot/.openclaw/genome/intelligence/predictive-engine'
const CONFIG_LOADER_PATH = '/Users/clawdbot/.openclaw/genome/core/project-config-loader'

// Pattern mirrored from auto-decompose.js for assertion use (not re-importing to avoid coupling)
const DASHBOARD_PATTERN = {
  name: 'Dashboard Pattern',
  subtasks: [
    { titleSuffix: ' - Data Layer', hours: 1.5, agent: 'dev', model: 'codex', acceptance_criteria: ['Data endpoints working', 'Schema defined'] },
    { titleSuffix: ' - UI Components', hours: 1.5, agent: 'dev', model: 'codex', acceptance_criteria: ['Components render', 'Styling complete'] },
    { titleSuffix: ' - Integration & Tests', hours: 1, agent: 'qc', model: 'codex', acceptance_criteria: ['Data flows to UI', 'Tests pass'] }
  ]
}

// Suppress help text printed by the module's IIFE on every require
beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}))
afterAll(() => jest.restoreAllMocks())

function makeStore(overrides = {}) {
  return {
    getTask: jest.fn().mockResolvedValue(null),
    createTask: jest.fn().mockResolvedValue({ id: 'new-id' }),
    updateTask: jest.fn().mockResolvedValue({}),
    addDependency: jest.fn().mockResolvedValue({}),
    getTasks: jest.fn().mockResolvedValue([]),
    ...overrides
  }
}

function makePredictMock(overrides = {}) {
  return {
    predictSuccess: jest.fn().mockReturnValue({
      shouldDecompose: false,
      baseSuccessRate: 65,
      decomposedSuccessRate: 85,
      predictedSuccessRate: 65,
      taskType: 'feature'
    }),
    shouldDecomposeTask: jest.fn().mockReturnValue(false),
    detectTaskType: jest.fn().mockReturnValue('feature'),
    ...overrides
  }
}

/**
 * Fresh module load with all dependencies mocked.
 * Returns { mod, store, predict, appendMock }.
 */
function loadModule(store, predict) {
  const appendMock = jest.fn()
  store = store || makeStore()
  predict = predict || makePredictMock()

  jest.resetModules()
  jest.doMock(TASK_STORE_PATH, () => ({ TaskStore: jest.fn(() => store) }))
  jest.doMock(PREDICTIVE_ENGINE_PATH, () => predict)
  jest.doMock(CONFIG_LOADER_PATH, () => ({
    getConfig: jest.fn().mockReturnValue({ project_id: 'leadflow' }),
    resolveStatePath: jest.fn().mockReturnValue('/tmp/.auto-decompose-log.jsonl'),
    resolveProjectPath: jest.fn().mockReturnValue('/tmp/LEARNINGS.md')
  }))
  jest.doMock('fs', () => ({ appendFileSync: appendMock }))

  const mod = require(AUTO_DECOMPOSE_PATH)
  return { mod, store, predict, appendMock }
}

// ── generateSubtasks ─────────────────────────────────────────────────────────

describe('generateSubtasks', () => {
  const parent = {
    id: 'parent-id',
    title: 'Build Analytics Dashboard',
    priority: 'high',
    project_id: 'leadflow'
  }

  test('returns one subtask per pattern entry', () => {
    const { mod } = loadModule()
    expect(mod.generateSubtasks(parent, DASHBOARD_PATTERN)).toHaveLength(3)
  })

  test('first subtask is ready; subsequent subtasks are blocked', () => {
    const { mod } = loadModule()
    const subtasks = mod.generateSubtasks(parent, DASHBOARD_PATTERN)
    expect(subtasks[0].status).toBe('ready')
    expect(subtasks[1].status).toBe('blocked')
    expect(subtasks[2].status).toBe('blocked')
  })

  test('title includes suffix and sequential (n of total) counter', () => {
    const { mod } = loadModule()
    const subtasks = mod.generateSubtasks(parent, DASHBOARD_PATTERN)
    expect(subtasks[0].title).toBe('Build Analytics Dashboard - Data Layer (1 of 3)')
    expect(subtasks[1].title).toBe('Build Analytics Dashboard - UI Components (2 of 3)')
    expect(subtasks[2].title).toBe('Build Analytics Dashboard - Integration & Tests (3 of 3)')
  })

  test('calculates cost per model: sonnet=$2/hr, codex=$0.5/hr, haiku=$0.5/hr, unknown=$0/hr', () => {
    const { mod } = loadModule()
    const pattern = {
      name: 'Test',
      subtasks: [
        { titleSuffix: ' - A', hours: 2, agent: 'dev', model: 'sonnet', acceptance_criteria: [] },
        { titleSuffix: ' - B', hours: 2, agent: 'dev', model: 'codex', acceptance_criteria: [] },
        { titleSuffix: ' - C', hours: 2, agent: 'dev', model: 'haiku', acceptance_criteria: [] },
        { titleSuffix: ' - D', hours: 2, agent: 'dev', model: 'opus', acceptance_criteria: [] }
      ]
    }
    const subtasks = mod.generateSubtasks(parent, pattern)
    expect(subtasks[0].estimated_cost_usd).toBe(4)  // 2 * 2.0
    expect(subtasks[1].estimated_cost_usd).toBe(1)  // 2 * 0.5
    expect(subtasks[2].estimated_cost_usd).toBe(1)  // 2 * 0.5
    expect(subtasks[3].estimated_cost_usd).toBe(0)  // unknown model → 0
  })

  test('first subtask has empty dependencies; each subsequent references the previous title', () => {
    const { mod } = loadModule()
    const subtasks = mod.generateSubtasks(parent, DASHBOARD_PATTERN)
    expect(subtasks[0].dependencies).toEqual([])
    expect(subtasks[1].dependencies).toEqual(['Build Analytics Dashboard - Data Layer (1 of 3)'])
    expect(subtasks[2].dependencies).toEqual(['Build Analytics Dashboard - UI Components (2 of 3)'])
  })

  test('sets parent_task_id and sequence_order on every subtask', () => {
    const { mod } = loadModule()
    const subtasks = mod.generateSubtasks(parent, DASHBOARD_PATTERN)
    subtasks.forEach((s, i) => {
      expect(s.parent_task_id).toBe('parent-id')
      expect(s.sequence_order).toBe(i + 1)
    })
  })

  test('uses parentTask.project_id when set; falls back to getConfig().project_id', () => {
    const { mod } = loadModule()
    const subtasks = mod.generateSubtasks(parent, DASHBOARD_PATTERN)
    subtasks.forEach(s => expect(s.project_id).toBe('leadflow'))

    const parentNoProject = { ...parent, project_id: undefined }
    const fallback = mod.generateSubtasks(parentNoProject, DASHBOARD_PATTERN)
    fallback.forEach(s => expect(s.project_id).toBe('leadflow'))  // from mocked getConfig
  })
})

// ── checkTaskForDecomposition ─────────────────────────────────────────────────

describe('checkTaskForDecomposition', () => {
  test('returns error object when task is not found', async () => {
    const { mod } = loadModule(makeStore({ getTask: jest.fn().mockResolvedValue(null) }))
    const result = await mod.checkTaskForDecomposition('ghost-id')
    expect(result).toEqual({ error: 'Task not found' })
  })

  test('returns shouldDecompose=false with reason when prediction disagrees', async () => {
    const task = { id: 't1', title: 'Write docs', estimated_hours: 2 }
    const predict = makePredictMock({
      predictSuccess: jest.fn().mockReturnValue({
        shouldDecompose: false,
        baseSuccessRate: 90,
        decomposedSuccessRate: 90,
        predictedSuccessRate: 90
      }),
      detectTaskType: jest.fn().mockReturnValue('documentation')
    })
    const { mod } = loadModule(makeStore({ getTask: jest.fn().mockResolvedValue(task) }), predict)
    const result = await mod.checkTaskForDecomposition('t1')
    expect(result.shouldDecompose).toBe(false)
    expect(result.taskId).toBe('t1')
    expect(result.taskType).toBe('documentation')
    expect(result.reason).toBe('Task within optimal size for single execution')
  })

  test('returns shouldDecompose=true with descriptive reason and matching pattern', async () => {
    const task = { id: 't2', title: 'Build dashboard', estimated_hours: 5 }
    const predict = makePredictMock({
      predictSuccess: jest.fn().mockReturnValue({
        shouldDecompose: true,
        baseSuccessRate: 45,
        decomposedSuccessRate: 95,
        predictedSuccessRate: 45
      }),
      detectTaskType: jest.fn().mockReturnValue('dashboard')
    })
    const { mod } = loadModule(makeStore({ getTask: jest.fn().mockResolvedValue(task) }), predict)
    const result = await mod.checkTaskForDecomposition('t2')
    expect(result.shouldDecompose).toBe(true)
    expect(result.reason).toContain('dashboard')
    expect(result.reason).toContain('45%')
    expect(result.reason).toContain('95%')
    expect(result.pattern).toBeTruthy()
    expect(result.pattern.subtasks).toHaveLength(3)
  })

  test('returns null pattern for task type with no decomposition pattern (e.g. bug_fix)', async () => {
    const task = { id: 't3', title: 'Fix auth bug', estimated_hours: 6 }
    const predict = makePredictMock({
      predictSuccess: jest.fn().mockReturnValue({
        shouldDecompose: true,
        baseSuccessRate: 70,
        decomposedSuccessRate: 70,
        predictedSuccessRate: 70
      }),
      detectTaskType: jest.fn().mockReturnValue('bug_fix')
    })
    const { mod } = loadModule(makeStore({ getTask: jest.fn().mockResolvedValue(task) }), predict)
    const result = await mod.checkTaskForDecomposition('t3')
    expect(result.shouldDecompose).toBe(true)
    expect(result.pattern).toBeNull()
  })

  test('exposes original and decomposed success rates in predictedSuccess', async () => {
    const task = { id: 't4', title: 'Integrate Stripe', estimated_hours: 4 }
    const predict = makePredictMock({
      predictSuccess: jest.fn().mockReturnValue({
        shouldDecompose: true,
        baseSuccessRate: 35,
        decomposedSuccessRate: 78,
        predictedSuccessRate: 35
      }),
      detectTaskType: jest.fn().mockReturnValue('integration')
    })
    const { mod } = loadModule(makeStore({ getTask: jest.fn().mockResolvedValue(task) }), predict)
    const result = await mod.checkTaskForDecomposition('t4')
    expect(result.predictedSuccess).toEqual({ original: 35, decomposed: 78 })
  })
})

// ── autoDecompose ─────────────────────────────────────────────────────────────

describe('autoDecompose', () => {
  const dashboardTask = {
    id: 'task-dash',
    title: 'Build Analytics Dashboard',
    estimated_hours: 5,
    project_id: 'leadflow'
  }

  function dashboardPredict() {
    return makePredictMock({
      predictSuccess: jest.fn().mockReturnValue({
        shouldDecompose: true,
        baseSuccessRate: 45,
        decomposedSuccessRate: 95,
        predictedSuccessRate: 45
      }),
      detectTaskType: jest.fn().mockReturnValue('dashboard')
    })
  }

  test('propagates task-not-found error', async () => {
    const { mod } = loadModule(makeStore({ getTask: jest.fn().mockResolvedValue(null) }))
    const result = await mod.autoDecompose('ghost-id')
    expect(result).toEqual({ error: 'Task not found' })
  })

  test('returns action=none when task does not need decomposition', async () => {
    const task = { id: 'doc-task', title: 'Write docs', estimated_hours: 2 }
    const predict = makePredictMock({
      predictSuccess: jest.fn().mockReturnValue({
        shouldDecompose: false,
        baseSuccessRate: 90,
        decomposedSuccessRate: 90,
        predictedSuccessRate: 90
      }),
      detectTaskType: jest.fn().mockReturnValue('documentation')
    })
    const { mod } = loadModule(makeStore({ getTask: jest.fn().mockResolvedValue(task) }), predict)
    const result = await mod.autoDecompose('doc-task')
    expect(result.action).toBe('none')
    expect(result.message).toBe('Task does not require decomposition')
  })

  test('returns action=manual_review when shouldDecompose but no pattern for the type', async () => {
    const task = { id: 'bug-task', title: 'Fix auth bug', estimated_hours: 8 }
    const predict = makePredictMock({
      predictSuccess: jest.fn().mockReturnValue({
        shouldDecompose: true,
        baseSuccessRate: 70,
        decomposedSuccessRate: 70,
        predictedSuccessRate: 70
      }),
      detectTaskType: jest.fn().mockReturnValue('bug_fix')
    })
    const { mod } = loadModule(makeStore({ getTask: jest.fn().mockResolvedValue(task) }), predict)
    const result = await mod.autoDecompose('bug-task')
    expect(result.action).toBe('manual_review')
    expect(result.message).toBe('No decomposition pattern available for this task type')
  })

  test('dryRun returns would_decompose summary without touching the store', async () => {
    const store = makeStore({ getTask: jest.fn().mockResolvedValue(dashboardTask) })
    const { mod } = loadModule(store, dashboardPredict())
    const result = await mod.autoDecompose('task-dash', true)

    expect(result.action).toBe('would_decompose')
    expect(result.subtasks).toHaveLength(3)
    expect(result.subtasks[0]).toMatchObject({ agent: 'dev', model: 'codex', hours: 1.5 })
    expect(result.totalHours).toBeCloseTo(4)  // 1.5 + 1.5 + 1
    expect(result.totalCost).toBeCloseTo(2)   // 4 hours × $0.5/hr (all codex)
    expect(store.createTask).not.toHaveBeenCalled()
    expect(store.updateTask).not.toHaveBeenCalled()
  })

  test('live run creates all subtasks and marks parent as superseded', async () => {
    const store = makeStore({
      getTask: jest.fn().mockResolvedValue(dashboardTask),
      createTask: jest.fn()
        .mockResolvedValueOnce({ id: 'sub-1' })
        .mockResolvedValueOnce({ id: 'sub-2' })
        .mockResolvedValueOnce({ id: 'sub-3' })
    })
    const { mod } = loadModule(store, dashboardPredict())
    const result = await mod.autoDecompose('task-dash', false)

    expect(result.action).toBe('decomposed')
    expect(store.createTask).toHaveBeenCalledTimes(3)
    expect(store.updateTask).toHaveBeenCalledWith(
      'task-dash',
      expect.objectContaining({
        status: 'superseded',
        superseded_by: expect.any(Array)
      })
    )
    expect(result.subtasksCreated).toHaveLength(3)
  })

  test('live run adds sequential hard dependencies between subtasks', async () => {
    const store = makeStore({
      getTask: jest.fn().mockResolvedValue(dashboardTask),
      createTask: jest.fn()
        .mockResolvedValueOnce({ id: 'sub-1' })
        .mockResolvedValueOnce({ id: 'sub-2' })
        .mockResolvedValueOnce({ id: 'sub-3' })
    })
    const { mod } = loadModule(store, dashboardPredict())
    await mod.autoDecompose('task-dash', false)

    expect(store.addDependency).toHaveBeenCalledTimes(2)
    expect(store.addDependency).toHaveBeenNthCalledWith(1, 'sub-2', 'sub-1', 'hard')
    expect(store.addDependency).toHaveBeenNthCalledWith(2, 'sub-3', 'sub-2', 'hard')
  })

  test('live run appends a JSON log entry via fs.appendFileSync', async () => {
    const store = makeStore({
      getTask: jest.fn().mockResolvedValue(dashboardTask),
      createTask: jest.fn()
        .mockResolvedValueOnce({ id: 'sub-1' })
        .mockResolvedValueOnce({ id: 'sub-2' })
        .mockResolvedValueOnce({ id: 'sub-3' })
    })
    const { mod, appendMock } = loadModule(store, dashboardPredict())
    await mod.autoDecompose('task-dash', false)

    expect(appendMock).toHaveBeenCalledTimes(1)
    const [logPath, rawEntry] = appendMock.mock.calls[0]
    expect(logPath).toBe('/tmp/.auto-decompose-log.jsonl')
    const entry = JSON.parse(rawEntry)
    expect(entry.parentTask).toBe('task-dash')
    expect(entry.subtasks).toHaveLength(3)
    expect(entry.timestamp).toBeTruthy()
  })
})

// ── processAllReadyTasks ──────────────────────────────────────────────────────

describe('processAllReadyTasks', () => {
  test('returns empty array when there are no ready tasks', async () => {
    const { mod } = loadModule(makeStore({ getTasks: jest.fn().mockResolvedValue([]) }))
    const results = await mod.processAllReadyTasks(true)
    expect(results).toEqual([])
  })

  test('skips tasks that do not need decomposition', async () => {
    const docTask = { id: 'doc-1', title: 'Write release notes', estimated_hours: 1 }
    const predict = makePredictMock({
      predictSuccess: jest.fn().mockReturnValue({
        shouldDecompose: false,
        baseSuccessRate: 90,
        decomposedSuccessRate: 90,
        predictedSuccessRate: 90
      }),
      detectTaskType: jest.fn().mockReturnValue('documentation')
    })
    const store = makeStore({
      getTasks: jest.fn().mockResolvedValue([docTask]),
      getTask: jest.fn().mockResolvedValue(docTask)
    })
    const { mod } = loadModule(store, predict)
    const results = await mod.processAllReadyTasks(true)
    expect(results).toHaveLength(0)
  })

  test('decomposes tasks that should be decomposed and returns results', async () => {
    const dashTask = { id: 'dash-1', title: 'Build dashboard', estimated_hours: 5, project_id: 'leadflow' }
    const predict = makePredictMock({
      predictSuccess: jest.fn().mockReturnValue({
        shouldDecompose: true,
        baseSuccessRate: 45,
        decomposedSuccessRate: 95,
        predictedSuccessRate: 45
      }),
      detectTaskType: jest.fn().mockReturnValue('dashboard')
    })
    const store = makeStore({
      getTasks: jest.fn().mockResolvedValue([dashTask]),
      getTask: jest.fn().mockResolvedValue(dashTask)
    })
    const { mod } = loadModule(store, predict)
    const results = await mod.processAllReadyTasks(true)  // dryRun=true
    expect(results).toHaveLength(1)
    expect(results[0].action).toBe('would_decompose')
    expect(results[0].subtasks).toHaveLength(3)
  })
})
