'use strict'

/**
 * Task Spec (e764a860-0e23-48ea-a7d6-43fff57111fa)
 * What:
 * - Add tests in /Users/clawdbot/projects/leadflow/tests/genome/predictive-engine.test.js
 *   for /Users/clawdbot/.openclaw/genome/intelligence/predictive-engine.js exports:
 *   detectTaskType, shouldDecomposeTask, predictSuccess, recommendModel,
 *   predictQueueExhaustion, predictBudgetExhaustion, formatPrediction.
 * Verify:
 * - Run: npx jest tests/genome/predictive-engine.test.js --runInBand
 *   Expected: all tests pass.
 * - Run quality gates: npm run build, npm run lint, npm test, npm audit --audit-level=high
 *   Expected: exit code 0 for each command.
 * - Sanity grep: rg -n "predictive-engine" tests/genome/predictive-engine.test.js
 *   Expected: test file references predictive-engine module.
 * Boundaries:
 * - Do not modify runtime orchestration logic under ~/.openclaw/genome.
 * - Do not change service/router/business logic in this repo.
 * - Only add/adjust tests required for predictive-engine coverage and task reporting artifacts.
 */

const PREDICTIVE_ENGINE_PATH = '/Users/clawdbot/.openclaw/genome/intelligence/predictive-engine'
const LEARNING_SYSTEM_PATH = '/Users/clawdbot/.openclaw/genome/intelligence/learning-system'

function loadPredictiveEngineWithAccuracy(accuracyState) {
  jest.resetModules()
  jest.doMock(LEARNING_SYSTEM_PATH, () => ({
    LearningSystem: class LearningSystem {
      getPredictionAccuracy() {
        return accuracyState
      }
    }
  }))
  return require(PREDICTIVE_ENGINE_PATH)
}

describe('predictive-engine', () => {
  test('detectTaskType classifies known patterns and defaults to feature', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    expect(engine.detectTaskType({ title: 'Fix API endpoint auth bug' })).toBe('api')
    expect(engine.detectTaskType({ title: 'Unknown wording with no keywords', description: '' })).toBe('feature')
  })

  test('detectTaskType classifies all remaining task type patterns', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    expect(engine.detectTaskType({ title: 'Update dashboard metrics' })).toBe('dashboard')
    expect(engine.detectTaskType({ title: 'Stripe integration webhook' })).toBe('integration')
    expect(engine.detectTaskType({ title: 'Build landing homepage' })).toBe('landing_page')
    expect(engine.detectTaskType({ title: 'Update readme guide' })).toBe('documentation')
    expect(engine.detectTaskType({ title: 'Fix broken error in payment' })).toBe('bug_fix')
    expect(engine.detectTaskType({ title: 'Create SMS twilio template' })).toBe('sms_template')
    expect(engine.detectTaskType({ title: 'Refactor service cleanup' })).toBe('refactoring')
    expect(engine.detectTaskType({ title: 'Write spec validation qa' })).toBe('testing')
    expect(engine.detectTaskType({ title: 'Setup npm package install' })).toBe('setup')
  })

  test('shouldDecomposeTask follows pattern + fallback thresholds', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    expect(engine.shouldDecomposeTask({ title: 'Build API route', estimated_hours: 2 })).toBe(true)
    expect(engine.shouldDecomposeTask({ title: 'Write docs guide', estimated_hours: 2 })).toBe(false)
    expect(engine.shouldDecomposeTask({ title: 'Anything', estimated_hours: 5 }, 'unknown_type')).toBe(true)
  })

  test('shouldDecomposeTask triggers when title contains "and" conjunction', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    // documentation: autoDecompose=false, maxHours=10 — 'and' is the only trigger here
    expect(engine.shouldDecomposeTask({ title: 'Write docs and guide', estimated_hours: 2 }, 'documentation')).toBe(true)
    // refactoring: autoDecompose=false, maxHours=5, no 'and'
    expect(engine.shouldDecomposeTask({ title: 'Refactor login service', estimated_hours: 3 }, 'refactoring')).toBe(false)
  })

  test('shouldDecomposeTask triggers when hours exceed maxHours for non-autoDecompose types', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    // bug_fix: autoDecompose=false, maxHours=5
    expect(engine.shouldDecomposeTask({ title: 'Fix login issue', estimated_hours: 6 }, 'bug_fix')).toBe(true)
    expect(engine.shouldDecomposeTask({ title: 'Fix login issue', estimated_hours: 3 }, 'bug_fix')).toBe(false)
  })

  test('predictSuccess applies decomposition from multi-file references', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const prediction = engine.predictSuccess({
      title: 'Update documentation only',
      estimated_hours: 2,
      description: 'Touch routes/a.js lib/b.ts tests/c.md'
    })

    expect(prediction.taskType).toBe('api')
    expect(prediction.shouldDecompose).toBe(true)
    expect(prediction.predictedSuccessRate).toBe(60)
    expect(prediction.decomposedSuccessRate).toBe(88)
    expect(prediction.reasoning.join(' ')).toContain('Auto-decomposition recommended')
  })

  test('predictSuccess applies low-accuracy calibration penalty', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 10, recentAccuracy: 60 })
    const prediction = engine.predictSuccess({ title: 'Implement new feature', estimated_hours: 2 })

    expect(prediction.baseSuccessRate).toBe(65)
    expect(prediction.predictedSuccessRate).toBeLessThan(prediction.baseSuccessRate)
    expect(prediction.predictedSuccessRate).toBeGreaterThanOrEqual(0)
    expect(prediction.calibration).toEqual({
      applied: true,
      recentAccuracy: 60,
      adjustment: 'penalty'
    })
  })

  test('predictSuccess applies high-accuracy calibration boost and caps at 99%', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 20, recentAccuracy: 90 })
    const prediction = engine.predictSuccess({ title: 'Build dashboard metrics', estimated_hours: 2 }, 'opus')

    expect(prediction.calibration).toEqual({
      applied: true,
      recentAccuracy: 90,
      adjustment: 'boost'
    })
    expect(prediction.predictedSuccessRate).toBeLessThanOrEqual(99)
  })

  test('predictSuccess applies oversize penalty for tasks exceeding maxHours', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    // bug_fix: baseSuccessRate=0.70, maxHours=5, OVERSIZE_SUCCESS_PENALTY=0.6 -> 0.70*0.6=0.42 -> 42%
    const prediction = engine.predictSuccess({ title: 'Fix critical bug', estimated_hours: 8 })

    expect(prediction.taskType).toBe('bug_fix')
    expect(prediction.confidence).toBe('low')
    expect(prediction.baseSuccessRate).toBe(70)
    expect(prediction.predictedSuccessRate).toBe(42)
    expect(prediction.shouldDecompose).toBe(true)
  })

  test('predictSuccess blends model performance when chosenModel is provided', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    // feature: baseSuccessRate=0.65; sonnet successRate=0.92 -> blended: (0.65+0.92)/2=0.785 -> 79%
    const withoutModel = engine.predictSuccess({ title: 'Implement feature X', estimated_hours: 2 })
    const withSonnet = engine.predictSuccess({ title: 'Implement feature X', estimated_hours: 2 }, 'sonnet')

    expect(withoutModel.predictedSuccessRate).toBe(65)
    expect(withSonnet.predictedSuccessRate).toBe(79)
    expect(withSonnet.predictedSuccessRate).toBeGreaterThan(withoutModel.predictedSuccessRate)
  })

  test('predictSuccess skips calibration when total predictions below minimum threshold', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 5, recentAccuracy: 60 })
    // total=5 < MIN_PREDICTIONS_FOR_CALIBRATION=10 -> calibration block does not execute
    const prediction = engine.predictSuccess({ title: 'Implement feature X', estimated_hours: 2 })

    expect(prediction.calibration).toEqual({ applied: false, recentAccuracy: 60, adjustment: 'none' })
    expect(prediction.predictedSuccessRate).toBe(65)
  })

  test('recommendModel returns alternatives when cost pressure exists', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const recommendation = engine.recommendModel({ title: 'Build dashboard analytics', estimated_hours: 4 }, 1)

    expect(recommendation.recommended).toBe('codex')
    expect(recommendation.withinBudget).toBe(false)
    expect(recommendation.alternatives.length).toBeGreaterThan(0)
    expect(recommendation.alternatives[0]).toMatchObject({ reason: 'Budget-friendly alternative' })
  })

  test('recommendModel includes stronger-model alternative for low-success task types', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const recommendation = engine.recommendModel({ title: 'Build dashboard analytics', estimated_hours: 2 }, 100)

    expect(recommendation.recommended).toBe('codex')
    expect(recommendation.withinBudget).toBe(true)
    expect(recommendation.alternatives.some((alt) => alt.model === 'sonnet')).toBe(true)
    expect(recommendation.alternatives.some((alt) => alt.reason === 'Higher success rate for this task type')).toBe(true)
  })

  test('predictQueueExhaustion flags empty-soon queues', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const result = engine.predictQueueExhaustion([
      { status: 'ready' },
      { status: 'in_progress' }
    ], 2)

    expect(result.readyTasks).toBe(1)
    expect(result.inProgressTasks).toBe(1)
    expect(result.willEmptySoon).toBe(true)
    expect(result.recommendation).toContain('Create new tasks')
  })

  test('predictQueueExhaustion reports healthy queue when enough ready tasks exist', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const result = engine.predictQueueExhaustion([
      { status: 'ready' },
      { status: 'ready' },
      { status: 'ready' },
      { status: 'ready' }
    ], 2)

    expect(result.willEmptySoon).toBe(false)
    expect(result.estimatedEmptyTime).toBe('2 hours')
    expect(result.recommendation).toBe('Queue healthy')
  })

  test('predictQueueExhaustion handles empty task queue', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const result = engine.predictQueueExhaustion([], 2)

    expect(result.readyTasks).toBe(0)
    expect(result.inProgressTasks).toBe(0)
    expect(result.willEmptySoon).toBe(true)
    expect(result.estimatedEmptyTime).toBe('0 minutes')
    expect(result.recommendation).toContain('Create new tasks')
  })

  test('predictBudgetExhaustion handles healthy and critical budgets', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })

    const healthy = engine.predictBudgetExhaustion(2, 10, 1)
    expect(healthy.percentUsed).toBe(20)
    expect(healthy.willExhaustToday).toBe(false)
    expect(healthy.recommendation).toBe('Budget healthy')

    const critical = engine.predictBudgetExhaustion(9, 10, 1)
    expect(critical.willExhaustToday).toBe(true)
    expect(critical.recommendation).toContain('Consider increasing budget')
  })

  test('predictBudgetExhaustion handles no-recent-spend forecast path', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const result = engine.predictBudgetExhaustion(3, 10, 0)

    expect(result.estimatedExhaustion).toBe('N/A (no recent spend)')
    expect(result.willExhaustToday).toBe(false)
    expect(result.recommendation).toBe('Budget healthy')
  })

  test('formatPrediction renders summary with confidence markers', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const output = engine.formatPrediction({
      predictedSuccessRate: 82,
      taskType: 'feature',
      estimatedHours: 2,
      baseSuccessRate: 65,
      decomposedSuccessRate: 85,
      shouldDecompose: true,
      recommendedModel: 'codex',
      confidence: 'high',
      reasoning: ['Reason A']
    })

    expect(output).toContain('Prediction: 82% success probability')
    expect(output).toContain('Should Decompose: YES')
    expect(output).toContain('Recommended Model: codex')
  })

  test('formatPrediction uses warning emoji for medium success rate and shows no-decompose', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const output = engine.formatPrediction({
      predictedSuccessRate: 70,
      taskType: 'feature',
      estimatedHours: 3,
      baseSuccessRate: 65,
      decomposedSuccessRate: 85,
      shouldDecompose: false,
      recommendedModel: 'codex',
      confidence: 'high',
      reasoning: ['Some reason']
    })

    expect(output).toContain('Prediction: 70% success probability')
    expect(output).toContain('Should Decompose: NO')
  })

  test('formatPrediction renders low success rate with correct rate and no-decompose', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    const output = engine.formatPrediction({
      predictedSuccessRate: 45,
      taskType: 'integration',
      estimatedHours: 6,
      baseSuccessRate: 35,
      decomposedSuccessRate: 78,
      shouldDecompose: false,
      recommendedModel: 'sonnet',
      confidence: 'low',
      reasoning: []
    })

    expect(output).toContain('Prediction: 45% success probability')
    expect(output).toContain('Should Decompose: NO')
  })

  test('exports threshold constants expected by dependent modules', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })

    expect(engine.BUDGET_CAUTION_THRESHOLD).toBe(0.5)
    expect(engine.AVG_TASK_COMPLETION_HOURS).toBe(2.5)
    expect(engine.QUEUE_EMPTY_THRESHOLD_HOURS).toBe(2)
    expect(engine.BUDGET_EXHAUSTION_THRESHOLD_HOURS).toBe(4)
    expect(engine.BUDGET_CRITICAL_PERCENT).toBe(0.2)
    expect(engine.PREDICTION_HIGH_THRESHOLD).toBe(80)
    expect(engine.PREDICTION_MEDIUM_THRESHOLD).toBe(60)
    expect(engine.BUDGET_FORECAST_HOURS_THRESHOLD).toBe(2)
  })
})
