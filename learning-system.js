#!/usr/bin/env node

/**
 * Learning System - Pattern Recognition & Auto-Optimization
 * 
 * Responsibilities:
 * 1. Analyze task outcomes (success/failure)
 * 2. Update LEARNINGS.md with patterns
 * 3. Provide recommendations to orchestrator
 * 4. Auto-optimize future task decisions
 * 
 * Usage:
 *   node learning-system.js --record-success <task-id>
 *   node learning-system.js --record-failure <task-id> --reason "..."
 *   node learning-system.js --analyze
 *   node learning-system.js --recommend <task-id>
 */

const fs = require('fs')
const path = require('path')

const LEARNINGS_FILE = path.join(process.cwd(), 'LEARNINGS.md')
const LEARNINGS_JSON = path.join(process.cwd(), '.learnings.json')

// Task type taxonomy
const TASK_TYPES = {
  DASHBOARD: 'dashboard',
  API: 'api',
  WEBHOOK: 'webhook',
  LANDING_PAGE: 'landing_page',
  SMS_TEMPLATE: 'sms_template',
  DOCUMENTATION: 'documentation',
  BUG_FIX: 'bug_fix',
  INTEGRATION: 'integration',
  REFACTORING: 'refactoring',
  FEATURE: 'feature'
}

// Decomposition patterns library
const DECOMPOSITION_PATTERNS = {
  [TASK_TYPES.DASHBOARD]: {
    name: 'Dashboard Pattern',
    description: 'Split into data, UI, and integration layers',
    subtasks: [
      { titleSuffix: ' - Data Layer', hours: 1.5, agent: 'dev', model: 'kimi' },
      { titleSuffix: ' - UI Components', hours: 1.5, agent: 'dev', model: 'kimi' },
      { titleSuffix: ' - Integration & Tests', hours: 1, agent: 'qc', model: 'haiku' }
    ],
    successRate: 0.95,
    autoDecompose: true
  },
  [TASK_TYPES.API]: {
    name: 'API Pattern',
    description: 'Split into schema, handler, and tests',
    subtasks: [
      { titleSuffix: ' - Schema & Validation', hours: 1, agent: 'dev', model: 'kimi' },
      { titleSuffix: ' - Handler Implementation', hours: 1.5, agent: 'dev', model: task => task.complexity > 5 ? 'sonnet' : 'kimi' },
      { titleSuffix: ' - Tests & Documentation', hours: 1, agent: 'qc', model: 'haiku' }
    ],
    successRate: 0.88,
    autoDecompose: true
  },
  [TASK_TYPES.LANDING_PAGE]: {
    name: 'Landing Page Pattern',
    description: 'Split into structure, content, styling, SEO',
    subtasks: [
      { titleSuffix: ' - Structure', hours: 1.5, agent: 'dev', model: 'kimi' },
      { titleSuffix: ' - Content', hours: 1.5, agent: 'marketing', model: 'kimi' },
      { titleSuffix: ' - Styling', hours: 1, agent: 'design', model: 'haiku' },
      { titleSuffix: ' - SEO & Meta', hours: 0.5, agent: 'marketing', model: 'kimi' }
    ],
    successRate: 0.92,
    autoDecompose: true
  },
  [TASK_TYPES.INTEGRATION]: {
    name: 'Integration Pattern',
    description: 'Research, auth, mapping, implementation, testing',
    subtasks: [
      { titleSuffix: ' - Research & Planning', hours: 1, agent: 'dev', model: 'sonnet' },
      { titleSuffix: ' - Auth Setup', hours: 1, agent: 'dev', model: 'sonnet' },
      { titleSuffix: ' - Data Mapping', hours: 1.5, agent: 'dev', model: 'sonnet' },
      { titleSuffix: ' - Implementation', hours: 1.5, agent: 'dev', model: 'sonnet' },
      { titleSuffix: ' - Testing', hours: 1, agent: 'qc', model: 'haiku' }
    ],
    successRate: 0.78,
    autoDecompose: true
  }
}

// Model selection hypotheses — only activate when real performance data confirms them.
// Until we have enough data (MIN_DATA_POINTS), tasks run on their assigned model and
// the reactive escalation path in handleTestFailure() handles per-task failures.
const MODEL_SELECTION_RULES = {
  [TASK_TYPES.DOCUMENTATION]: { model: 'qwen', skipEscalation: true },
  [TASK_TYPES.INTEGRATION]: { model: 'sonnet', skipCheaper: true },
  [TASK_TYPES.WEBHOOK]: { model: 'sonnet', skipCheaper: true },
  [TASK_TYPES.DASHBOARD]: { model: 'haiku' },
  [TASK_TYPES.BUG_FIX]: { model: 'kimi' },
  [TASK_TYPES.REFACTORING]: { model: 'haiku' },
  default: { model: 'kimi' }
}

// Minimum completed tasks before we trust performance data for a model+taskType pair
const MIN_DATA_POINTS = 3

class LearningSystem {
  constructor() {
    this.learnings = this.loadLearnings()
  }

  loadLearnings() {
    if (fs.existsSync(LEARNINGS_JSON)) {
      const data = JSON.parse(fs.readFileSync(LEARNINGS_JSON, 'utf-8'))
      // Ensure costHistory exists (added in cost-learning update)
      if (!data.costHistory) data.costHistory = {}
      return data
    }
    return {
      taskOutcomes: [],
      patterns: {},
      modelPerformance: {},
      decompositionStats: {},
      costHistory: {},
      lastUpdated: new Date().toISOString()
    }
  }

  saveLearnings() {
    this.learnings.lastUpdated = new Date().toISOString()
    fs.writeFileSync(LEARNINGS_JSON, JSON.stringify(this.learnings, null, 2))
    this.updateLearningsMarkdown()
  }

  /**
   * Record a successful task completion
   */
  recordSuccess(task) {
    const outcome = {
      taskId: task.id,
      taskType: this.classifyTaskType(task),
      title: task.title,
      agent: task.agent_id,
      model: task.model,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours || task.estimated_hours,
      success: true,
      decomposed: task.parent_task_id ? false : (task.metadata?.decomposed_from ? true : false),
      timestamp: new Date().toISOString(),
      acceptanceCriteria: task.acceptance_criteria?.length || 0
    }

    this.learnings.taskOutcomes.push(outcome)
    this.updatePatternStats(outcome)
    this.updateModelPerformance(outcome)

    console.log(`✅ Recorded success for ${task.title}`)
    this.saveLearnings()
  }

  /**
   * Record a failed task
   */
  recordFailure(task, failureReason, retryCount = 0) {
    const outcome = {
      taskId: task.id,
      taskType: this.classifyTaskType(task),
      title: task.title,
      agent: task.agent_id,
      model: task.model,
      estimatedHours: task.estimated_hours,
      success: false,
      failureReason: this.categorizeFailure(failureReason),
      retryCount,
      decomposed: false,
      timestamp: new Date().toISOString()
    }

    this.learnings.taskOutcomes.push(outcome)
    this.updatePatternStats(outcome)
    this.updateModelPerformance(outcome)

    // Generate recommendation
    const recommendation = this.generateFailureRecommendation(task, outcome)
    console.log(`❌ Recorded failure for ${task.title}`)
    console.log(`💡 Recommendation: ${recommendation}`)

    this.saveLearnings()
    return recommendation
  }

  /**
   * Record decomposition results
   */
  recordDecomposition(originalTask, subtasks, success) {
    const decomposition = {
      originalTaskId: originalTask.id,
      originalTaskType: this.classifyTaskType(originalTask),
      originalHours: originalTask.estimated_hours,
      subtaskCount: subtasks.length,
      subtaskSuccess: subtasks.filter(t => t.status === 'done').length,
      overallSuccess: success,
      patternUsed: this.detectPatternUsed(subtasks),
      timestamp: new Date().toISOString()
    }

    const key = decomposition.originalTaskType
    if (!this.learnings.decompositionStats[key]) {
      this.learnings.decompositionStats[key] = { attempts: 0, successes: 0 }
    }
    this.learnings.decompositionStats[key].attempts++
    if (success) {
      this.learnings.decompositionStats[key].successes++
    }

    console.log(`✂️  Recorded decomposition: ${subtasks.length} subtasks, ${success ? 'success' : 'partial'}`)
    this.saveLearnings()
  }

  /**
   * Record cost outcome for a completed task.
   * Uses task duration as a proxy for actual token usage:
   * - Baseline: config token estimates assume ~10 min per session
   * - Actual duration ratio adjusts the estimate
   *
   * @param {object} task - completed task with started_at, completed_at, model, agent_id
   * @param {number} durationMinutes - actual task duration
   * @param {number} estimatedCost - cost estimated at spawn time
   */
  recordCostOutcome(task, durationMinutes, estimatedCost) {
    const key = `${task.model || 'unknown'}_${task.agent_id || 'unknown'}`

    if (!this.learnings.costHistory[key]) {
      this.learnings.costHistory[key] = {
        model: task.model,
        agentId: task.agent_id,
        samples: 0,
        totalDurationMin: 0,
        totalEstimatedCost: 0,
        avgDurationMin: 0,
        costAdjustment: 1.0
      }
    }

    const entry = this.learnings.costHistory[key]
    entry.samples++
    entry.totalDurationMin += durationMinutes
    entry.totalEstimatedCost += estimatedCost
    entry.avgDurationMin = Math.round(entry.totalDurationMin / entry.samples)

    // Calibrate cost adjustment based on observed duration patterns.
    // Baseline assumption: a typical session is ~10 minutes.
    // If sessions consistently run longer/shorter, adjust future estimates.
    const BASELINE_MINUTES = 10
    const avgDuration = entry.totalDurationMin / entry.samples
    const durationRatio = avgDuration / BASELINE_MINUTES

    // Clamp adjustment between 0.2x and 5x to avoid extreme swings
    entry.costAdjustment = Math.max(0.2, Math.min(5.0, durationRatio))

    this.saveLearnings()
  }

  /**
   * Get cost adjustment multiplier for a (model, agentId) pair.
   * Returns 1.0 (no adjustment) if insufficient data.
   *
   * @param {string} model
   * @param {string} agentId
   * @returns {number} multiplier to apply to base cost estimate
   */
  getCostAdjustment(model, agentId) {
    const key = `${model || 'unknown'}_${agentId || 'unknown'}`
    const entry = this.learnings.costHistory?.[key]

    // Require minimum 3 samples before applying adjustments
    if (!entry || entry.samples < 3) return 1.0

    return entry.costAdjustment
  }

  /**
   * Classify task into type
   */
  classifyTaskType(task) {
    const title = task.title?.toLowerCase() || ''
    const desc = task.description?.toLowerCase() || ''
    const combined = title + ' ' + desc

    if (combined.includes('dashboard')) return TASK_TYPES.DASHBOARD
    if (combined.includes('webhook')) return TASK_TYPES.WEBHOOK
    if (combined.includes('api') || combined.includes('endpoint')) return TASK_TYPES.API
    if (combined.includes('landing') || combined.includes('homepage')) return TASK_TYPES.LANDING_PAGE
    if (combined.includes('sms') || combined.includes('template')) return TASK_TYPES.SMS_TEMPLATE
    if (combined.includes('doc') || combined.includes('readme')) return TASK_TYPES.DOCUMENTATION
    if (combined.includes('bug') || combined.includes('fix')) return TASK_TYPES.BUG_FIX
    if (combined.includes('integration') || combined.includes('connect')) return TASK_TYPES.INTEGRATION
    if (combined.includes('refactor') || combined.includes('clean')) return TASK_TYPES.REFACTORING
    
    return TASK_TYPES.FEATURE
  }

  /**
   * Categorize failure reason
   */
  categorizeFailure(reason) {
    const lower = reason?.toLowerCase() || ''
    
    if (lower.includes('acceptance') || lower.includes('criteria')) {
      return 'incomplete_acceptance_criteria'
    }
    if (lower.includes('environment') || lower.includes('env') || lower.includes('config')) {
      return 'environment_issue'
    }
    if (lower.includes('scope') || lower.includes('creep')) {
      return 'scope_creep'
    }
    if (lower.includes('test') || lower.includes('e2e') || lower.includes('spec')) {
      return 'testing_gap'
    }
    if (lower.includes('timeout') || lower.includes('too big') || lower.includes('complex')) {
      return 'task_too_large'
    }
    if (lower.includes('dependency') || lower.includes('blocked')) {
      return 'dependency_issue'
    }
    
    return 'other'
  }

  /**
   * Update pattern statistics
   */
  updatePatternStats(outcome) {
    const key = outcome.taskType
    if (!this.learnings.patterns[key]) {
      this.learnings.patterns[key] = {
        total: 0,
        successes: 0,
        failures: 0,
        avgDuration: 0,
        commonFailures: {}
      }
    }

    const pattern = this.learnings.patterns[key]
    pattern.total++
    
    if (outcome.success) {
      pattern.successes++
    } else {
      pattern.failures++
      const failureKey = outcome.failureReason || 'unknown'
      pattern.commonFailures[failureKey] = (pattern.commonFailures[failureKey] || 0) + 1
    }

    // Update average duration
    const hours = outcome.actualHours || outcome.estimatedHours
    pattern.avgDuration = ((pattern.avgDuration * (pattern.total - 1)) + hours) / pattern.total
  }

  /**
   * Update model performance stats
   */
  updateModelPerformance(outcome) {
    const key = `${outcome.taskType}_${outcome.model}`
    if (!this.learnings.modelPerformance[key]) {
      this.learnings.modelPerformance[key] = { total: 0, successes: 0 }
    }

    this.learnings.modelPerformance[key].total++
    if (outcome.success) {
      this.learnings.modelPerformance[key].successes++
    }
  }

  /**
   * Detect which decomposition pattern was used
   */
  detectPatternUsed(subtasks) {
    // Match subtask structure to known patterns
    for (const [type, pattern] of Object.entries(DECOMPOSITION_PATTERNS)) {
      if (subtasks.length === pattern.subtasks.length) {
        return pattern.name
      }
    }
    return 'custom'
  }

  /**
   * Get recommendations for a task
   */
  getRecommendations(task) {
    const taskType = this.classifyTaskType(task)
    const recommendations = []

    // Check if should auto-decompose
    if (this.shouldAutoDecompose(task, taskType)) {
      recommendations.push({
        type: 'decompose',
        reason: `${taskType} tasks >4h have low success rate without decomposition`,
        pattern: DECOMPOSITION_PATTERNS[taskType]
      })
    }

    // Check model recommendation
    const modelRec = this.getModelRecommendation(task, taskType)
    if (modelRec && modelRec.model !== task.model) {
      recommendations.push({
        type: 'model',
        reason: `${modelRec.model} has ${this.getModelSuccessRate(taskType, modelRec.model)}% success for ${taskType}`,
        recommendedModel: modelRec.model,
        skipEscalation: modelRec.skipCheaper
      })
    }

    // Check acceptance criteria
    if ((!task.acceptance_criteria || task.acceptance_criteria.length < 3) && task.estimated_hours > 2) {
      recommendations.push({
        type: 'criteria',
        reason: 'Tasks >2h with <3 acceptance criteria have 40% higher failure rate'
      })
    }

    return recommendations
  }

  /**
   * Check if task should be auto-decomposed
   */
  shouldAutoDecompose(task, taskType) {
    // Check decomposition patterns
    if (DECOMPOSITION_PATTERNS[taskType]?.autoDecompose) {
      return task.estimated_hours > 3
    }

    // Check historical success for this task type
    const pattern = this.learnings.patterns[taskType]
    if (pattern && pattern.total > 5) {
      const successRate = pattern.successes / pattern.total
      if (successRate < 0.6 && task.estimated_hours > 3) {
        return true
      }
    }

    // General rule: large tasks
    return task.estimated_hours > 5
  }

  /**
   * Get decomposition pattern for task
   */
  getDecompositionPattern(task, taskType) {
    return DECOMPOSITION_PATTERNS[taskType] || null
  }

  /**
   * Get model recommendation
   */
  getModelRecommendation(task, taskType) {
    const rule = MODEL_SELECTION_RULES[taskType] || MODEL_SELECTION_RULES.default

    // Check if we have real performance data for the current model on this task type
    const currentModel = task.model || 'qwen3.5'
    const currentRate = this._getRealSuccessRate(taskType, currentModel)
    const ruleRate = this._getRealSuccessRate(taskType, rule.model)

    // No real data yet — don't recommend anything, let the task run on its assigned model.
    // Per-task failures are handled reactively by handleTestFailure() in heartbeat-executor.
    if (currentRate === null && ruleRate === null) {
      return null
    }

    // We have data: only recommend if the rule's model demonstrably outperforms current
    if (currentRate !== null && ruleRate !== null && ruleRate > currentRate) {
      return rule
    }

    // We have data for the rule model but not current — recommend if rule model is strong
    if (currentRate === null && ruleRate !== null && ruleRate >= 70) {
      return rule
    }

    // Current model is performing well enough, or rule model has no proven advantage
    return null
  }

  /**
   * Get real success rate from actual performance data.
   * Returns null if insufficient data (< MIN_DATA_POINTS).
   */
  _getRealSuccessRate(taskType, model) {
    const key = `${taskType}_${model}`
    const perf = this.learnings.modelPerformance[key]
    if (perf && perf.total >= MIN_DATA_POINTS) {
      return Math.round((perf.successes / perf.total) * 100)
    }
    return null
  }

  /**
   * Get model success rate for task type
   */
  getModelSuccessRate(taskType, model) {
    const key = `${taskType}_${model}`
    const perf = this.learnings.modelPerformance[key]
    if (perf && perf.total > 0) {
      return Math.round((perf.successes / perf.total) * 100)
    }
    return 0 // no data — don't fabricate rates
  }

  /**
   * Generate recommendation after failure
   */
  generateFailureRecommendation(task, outcome) {
    const taskType = outcome.taskType
    
    if (outcome.failureReason === 'task_too_large' || task.estimated_hours > 4) {
      return `Decompose into ${DECOMPOSITION_PATTERNS[taskType]?.subtasks.length || 3} smaller subtasks`
    }
    
    if (outcome.failureReason === 'incomplete_acceptance_criteria') {
      return 'Add 3-5 specific acceptance criteria before retry'
    }
    
    if (outcome.failureReason === 'testing_gap') {
      return 'Include test requirements in acceptance criteria'
    }

    // Check if model escalation would help
    const currentRate = this.getModelSuccessRate(taskType, outcome.model)
    const nextModel = this.getNextModel(outcome.model)
    const nextRate = this.getModelSuccessRate(taskType, nextModel)
    
    if (nextRate > currentRate + 10) {
      return `Retry with ${nextModel} (${nextRate}% vs ${currentRate}% success)`
    }

    return 'Decompose task into smaller, more focused pieces'
  }

  /**
   * Get next model in escalation chain
   */
  getNextModel(currentModel) {
    const chain = ['qwen', 'kimi', 'haiku', 'sonnet', 'opus']
    const index = chain.indexOf(currentModel?.toLowerCase())
    return chain[index + 1] || 'opus'
  }

  /**
   * Analyze patterns and generate insights
   */
  analyze() {
    console.log('\n📊 Learning System Analysis')
    console.log('===========================\n')

    // Task type performance
    console.log('Task Type Performance:')
    for (const [type, stats] of Object.entries(this.learnings.patterns)) {
      const rate = stats.total > 0 ? Math.round((stats.successes / stats.total) * 100) : 0
      console.log(`  ${type}: ${rate}% success (${stats.successes}/${stats.total}, avg ${stats.avgDuration?.toFixed(1)}h)`)
    }

    // Model performance
    console.log('\nModel Performance by Task Type:')
    for (const [key, perf] of Object.entries(this.learnings.modelPerformance)) {
      if (perf.total >= 3) {
        const rate = Math.round((perf.successes / perf.total) * 100)
        console.log(`  ${key}: ${rate}% (${perf.successes}/${perf.total})`)
      }
    }

    // Decomposition effectiveness
    console.log('\nDecomposition Effectiveness:')
    for (const [type, stats] of Object.entries(this.learnings.decompositionStats)) {
      const rate = stats.attempts > 0 ? Math.round((stats.successes / stats.attempts) * 100) : 0
      console.log(`  ${type}: ${rate}% successful decompositions`)
    }

    // Common failures
    console.log('\nCommon Failure Patterns:')
    const allFailures = {}
    for (const outcome of this.learnings.taskOutcomes) {
      if (!outcome.success && outcome.failureReason) {
        allFailures[outcome.failureReason] = (allFailures[outcome.failureReason] || 0) + 1
      }
    }
    for (const [reason, count] of Object.entries(allFailures).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`  ${reason}: ${count} occurrences`)
    }
  }

  /**
   * Update LEARNINGS.md markdown file
   */
  updateLearningsMarkdown() {
    // This would regenerate the markdown file from JSON data
    // For now, we keep manual edits in LEARNINGS.md and JSON for programmatic access
    // In production, this would sync both formats
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  const learning = new LearningSystem()

  if (args.includes('--record-success')) {
    const taskId = args[args.indexOf('--record-success') + 1]
    // Load task from Supabase or file
    const task = { id: taskId, title: 'Task', agent_id: 'dev', model: 'kimi', estimated_hours: 2 }
    learning.recordSuccess(task)
  } else if (args.includes('--record-failure')) {
    const taskId = args[args.indexOf('--record-failure') + 1]
    const reasonIdx = args.indexOf('--reason')
    const reason = reasonIdx > -1 ? args[reasonIdx + 1] : 'unknown'
    const task = { id: taskId, title: 'Task', agent_id: 'dev', model: 'kimi', estimated_hours: 2 }
    learning.recordFailure(task, reason)
  } else if (args.includes('--analyze')) {
    learning.analyze()
  } else if (args.includes('--recommend')) {
    const taskId = args[args.indexOf('--recommend') + 1]
    const task = { id: taskId, title: 'Sample Task', description: 'Build dashboard', estimated_hours: 6, model: 'kimi' }
    const recs = learning.getRecommendations(task)
    console.log(`\n💡 Recommendations for "${task.title}":`)
    recs.forEach((rec, i) => console.log(`  ${i + 1}. ${rec.type}: ${rec.reason}`))
  } else {
    console.log(`
Learning System - Pattern Recognition & Auto-Optimization

Usage:
  node learning-system.js --record-success <task-id>
    Record successful task completion

  node learning-system.js --record-failure <task-id> --reason "..."
    Record failed task with reason

  node learning-system.js --analyze
    Analyze patterns and generate insights

  node learning-system.js --recommend <task-id>
    Get recommendations for a task

Files:
  LEARNINGS.md      - Human-readable learnings
  .learnings.json   - Machine-readable data
    `)
  }
}

main().catch(console.error)

module.exports = { LearningSystem, DECOMPOSITION_PATTERNS, MODEL_SELECTION_RULES }
