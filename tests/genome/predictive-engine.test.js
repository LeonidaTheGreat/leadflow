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

const PREDICTIVE_ENGINE_PATH = require('path').join(require('os').homedir(), '.openclaw', 'genome', 'intelligence', 'predictive-engine')
const LEARNING_SYSTEM_PATH = require('path').join(require('os').homedir(), '.openclaw', 'genome', 'intelligence', 'learning-system')

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

  test('shouldDecomposeTask follows pattern + fallback thresholds', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })
    expect(engine.shouldDecomposeTask({ title: 'Build API route', estimated_hours: 2 })).toBe(true)
    expect(engine.shouldDecomposeTask({ title: 'Write docs guide', estimated_hours: 2 })).toBe(false)
    expect(engine.shouldDecomposeTask({ title: 'Anything', estimated_hours: 5 }, 'unknown_type')).toBe(true)
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

  test('exports threshold constants expected by dependent modules', () => {
    const engine = loadPredictiveEngineWithAccuracy({ total: 0, recentAccuracy: null })

    expect(engine.AVG_TASK_COMPLETION_HOURS).toBe(2.5)
    expect(engine.QUEUE_EMPTY_THRESHOLD_HOURS).toBe(2)
    expect(engine.BUDGET_EXHAUSTION_THRESHOLD_HOURS).toBe(4)
    expect(engine.BUDGET_CRITICAL_PERCENT).toBe(0.2)
    expect(engine.PREDICTION_HIGH_THRESHOLD).toBe(80)
    expect(engine.PREDICTION_MEDIUM_THRESHOLD).toBe(60)
    expect(engine.BUDGET_FORECAST_HOURS_THRESHOLD).toBe(2)
  })
})
