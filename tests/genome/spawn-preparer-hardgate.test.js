'use strict'

/**
 * Regression tests: shouldDecompose is a hard gate at spawn time (task c3ce5646).
 *
 * Bug: spawn-preparer.js previously required `shouldDecompose=true AND predictedSuccessRate < 65%`.
 * Tasks flagged for decomposition with predicted success >= 65% were spawned as monoliths.
 * Old fall-through: when autoDecompose returned action='none', the task was spawned anyway.
 *
 * Fix: shouldDecompose is now an unconditional hard gate. When set, prepareAndQueueSpawn
 * always returns null — regardless of success rate, and regardless of what autoDecompose
 * returns or whether it throws.
 *
 * What:   Tests for prepareAndQueueSpawn in ~/.openclaw/genome/core/spawn-preparer.js
 * Verify: npx jest tests/genome/spawn-preparer-hardgate.test.js --runInBand
 * Bounds: Do not modify spawn-preparer.js or other genome files via these tests.
 */

const SPAWN_PREPARER_PATH = '/Users/clawdbot/.openclaw/genome/core/spawn-preparer'
const CONFIG_LOADER_PATH = '/Users/clawdbot/.openclaw/genome/core/project-config-loader'
const MODEL_SELECTOR_PATH = '/Users/clawdbot/.openclaw/genome/core/model-selector'
const BUDGET_MANAGER_PATH = '/Users/clawdbot/.openclaw/genome/core/budget-manager'
const DECISION_TRACKER_PATH = '/Users/clawdbot/.openclaw/genome/intelligence/orchestrator-decision-tracker'
const PREDICTIVE_ENGINE_PATH = '/Users/clawdbot/.openclaw/genome/intelligence/predictive-engine'
const AUTO_DECOMPOSE_PATH = '/Users/clawdbot/.openclaw/genome/intelligence/auto-decompose'

beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}))
afterAll(() => jest.restoreAllMocks())

function loadModule({ shouldDecompose = false, predictedSuccessRate = 70, autoDecomposeFn = null } = {}) {
  jest.resetModules()

  const defaultAutoDecompose = jest.fn().mockResolvedValue({
    action: 'decomposed',
    subtasksCreated: [{ id: 'sub-1' }, { id: 'sub-2' }]
  })

  jest.doMock(CONFIG_LOADER_PATH, () => ({
    resolveStatePath: jest.fn().mockReturnValue('/tmp/spawn-queue-hardgate-test.json')
  }))
  jest.doMock(MODEL_SELECTOR_PATH, () => ({
    estimateCost: jest.fn().mockReturnValue(0.5),
    getModelSampleCount: jest.fn().mockReturnValue(20),
    modelLadderIndex: jest.fn().mockReturnValue(1)
  }))
  jest.doMock(BUDGET_MANAGER_PATH, () => ({
    recordSpawn: jest.fn()
  }))
  jest.doMock(DECISION_TRACKER_PATH, () => ({
    recordDecision: jest.fn(),
    DECISION_TYPES: { SPAWN_TIMING: 'spawn_timing' }
  }))
  jest.doMock(PREDICTIVE_ENGINE_PATH, () => ({
    predictSuccess: jest.fn().mockReturnValue({
      shouldDecompose,
      predictedSuccessRate,
      decomposedSuccessRate: 92,
      recommendedModel: null
    }),
    shouldDecomposeTask: jest.fn().mockReturnValue(shouldDecompose)
  }))
  jest.doMock(AUTO_DECOMPOSE_PATH, () => ({
    autoDecompose: autoDecomposeFn || defaultAutoDecompose
  }))
  jest.doMock('/Users/clawdbot/.openclaw/genome/intelligence/learning-system', () => ({
    LearningSystem: class {
      getRecommendations() { return [] }
      recordFailure() {}
    }
  }))
  jest.doMock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(false),
    readFileSync: jest.fn().mockReturnValue('[]'),
    writeFileSync: jest.fn()
  }))

  return require(SPAWN_PREPARER_PATH)
}

function makeStore(overrides = {}) {
  return {
    db: null,  // disable all DB queries — focuses tests on predictive/decompose logic
    projectId: 'leadflow',
    query: jest.fn(),
    getTask: jest.fn().mockResolvedValue(null),
    updateTask: jest.fn().mockResolvedValue({}),
    getUseCase: jest.fn().mockResolvedValue(null),
    getDependencies: jest.fn().mockResolvedValue([]),
    getCodeReviews: jest.fn().mockResolvedValue([]),
    findTaskByTitle: jest.fn().mockResolvedValue(null),
    createTask: jest.fn().mockResolvedValue({ id: 'new-task' }),
    updateUseCase: jest.fn().mockResolvedValue({}),
    ...overrides
  }
}

function makeLearner() {
  return {
    getRecommendations: jest.fn().mockReturnValue([]),
    learnings: { modelPerformance: {} }
  }
}

function makeTask(overrides = {}) {
  return {
    id: 'task-abc',
    title: 'Build dashboard and API integration',
    agent_id: 'dev',
    model: 'codex',
    retry_count: 0,
    max_retries: 3,
    estimated_hours: 5,
    project_id: 'leadflow',
    metadata: {},
    ...overrides
  }
}

describe('shouldDecompose hard gate', () => {
  test('shouldDecompose=true blocks spawn even when predictedSuccessRate is above 65%', async () => {
    // Regression: old code required `shouldDecompose=true AND successRate < 65%`.
    // Tasks at 75% success were spawned as monoliths instead of being decomposed.
    const { prepareAndQueueSpawn } = loadModule({ shouldDecompose: true, predictedSuccessRate: 75 })
    const result = await prepareAndQueueSpawn(makeStore(), makeLearner(), makeTask(), { remaining: 10 }, new Set())
    expect(result).toBeNull()
  })

  test('shouldDecompose=true blocks spawn at very high success rate (95%)', async () => {
    const { prepareAndQueueSpawn } = loadModule({ shouldDecompose: true, predictedSuccessRate: 95 })
    const result = await prepareAndQueueSpawn(makeStore(), makeLearner(), makeTask(), { remaining: 10 }, new Set())
    expect(result).toBeNull()
  })

  test('shouldDecompose=true blocks spawn even when autoDecompose returns action=none', async () => {
    // Regression: old code fell through to spawn when autoDecompose returned 'none'.
    // The hard gate must block regardless of decomposition outcome.
    const noopDecompose = jest.fn().mockResolvedValue({ action: 'none', message: 'No pattern' })
    const { prepareAndQueueSpawn } = loadModule({ shouldDecompose: true, predictedSuccessRate: 80, autoDecomposeFn: noopDecompose })
    const result = await prepareAndQueueSpawn(makeStore(), makeLearner(), makeTask(), { remaining: 10 }, new Set())
    expect(noopDecompose).toHaveBeenCalledWith('task-abc', false)
    expect(result).toBeNull()
  })

  test('shouldDecompose=true blocks spawn even when autoDecompose throws', async () => {
    // Error path: if decomposition itself fails, the parent spawn is still blocked.
    const throwingDecompose = jest.fn().mockRejectedValue(new Error('Decompose service unavailable'))
    const { prepareAndQueueSpawn } = loadModule({ shouldDecompose: true, predictedSuccessRate: 80, autoDecomposeFn: throwingDecompose })
    const result = await prepareAndQueueSpawn(makeStore(), makeLearner(), makeTask(), { remaining: 10 }, new Set())
    expect(result).toBeNull()
  })

  test('shouldDecompose=false does not trigger decomposition, task is spawned', async () => {
    const autoDecomposeFn = jest.fn()
    const { prepareAndQueueSpawn } = loadModule({ shouldDecompose: false, predictedSuccessRate: 30, autoDecomposeFn })
    const result = await prepareAndQueueSpawn(makeStore(), makeLearner(), makeTask(), { remaining: 10 }, new Set())
    expect(autoDecomposeFn).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
    expect(result.taskId).toBe('task-abc')
  })

  test('decomposition gate is skipped for retry tasks (retry_count > 0)', async () => {
    // Retries already have failure context — skip predictive analysis.
    const autoDecomposeFn = jest.fn()
    const { prepareAndQueueSpawn } = loadModule({ shouldDecompose: true, predictedSuccessRate: 75, autoDecomposeFn })
    const result = await prepareAndQueueSpawn(makeStore(), makeLearner(), makeTask({ retry_count: 1 }), { remaining: 10 }, new Set())
    expect(autoDecomposeFn).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
  })

  test('decomposition gate is skipped for qc agent', async () => {
    // Predictive analysis only runs for dev/design — qc agents bypass it.
    const autoDecomposeFn = jest.fn()
    const { prepareAndQueueSpawn } = loadModule({ shouldDecompose: true, predictedSuccessRate: 75, autoDecomposeFn })
    const result = await prepareAndQueueSpawn(makeStore(), makeLearner(), makeTask({ agent_id: 'qc' }), { remaining: 10 }, new Set())
    expect(autoDecomposeFn).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
  })

  test('decomposition gate is skipped for product agent', async () => {
    const autoDecomposeFn = jest.fn()
    const { prepareAndQueueSpawn } = loadModule({ shouldDecompose: true, predictedSuccessRate: 75, autoDecomposeFn })
    const result = await prepareAndQueueSpawn(makeStore(), makeLearner(), makeTask({ agent_id: 'product' }), { remaining: 10 }, new Set())
    expect(autoDecomposeFn).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
  })

  test('design agent is subject to the decomposition gate', async () => {
    const autoDecomposeFn = jest.fn().mockResolvedValue({ action: 'decomposed', subtasksCreated: [{ id: 's1' }] })
    const { prepareAndQueueSpawn } = loadModule({ shouldDecompose: true, predictedSuccessRate: 80, autoDecomposeFn })
    const result = await prepareAndQueueSpawn(makeStore(), makeLearner(), makeTask({ agent_id: 'design' }), { remaining: 10 }, new Set())
    expect(autoDecomposeFn).toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
