#!/usr/bin/env node
/**
 * Dynamic Model Selector
 * 
 * Evaluates task complexity and selects optimal model.
 * Starts with Qwen (cheap), escalates if needed.
 * Logs all decisions and outcomes for dashboard metrics.
 * 
 * Usage: 
 *   const model = selectModel(task, history)
 *   const result = await spawnWithModel(task, model)
 *   evaluateAndMaybeEscalate(result, task)
 */

import * as fs from 'fs'
import * as path from 'path'

const BO2026_ROOT = '/Users/clawdbot/.openclaw/workspace/business-opportunities-2026'
const MODEL_LOG_FILE = path.join(BO2026_ROOT, 'model-selection-log.jsonl')

// Model definitions with cost and capability scores
const MODELS = {
  'qwen3-next': {
    name: 'Qwen3-Next-80B',
    costPer1kTokens: 0, // Free (local)
    complexityLimit: 5, // 1-10 scale
    bestFor: ['simple coding', 'documentation', 'data transformation', 'summarization'],
    avgLatency: '2s',
    successRateBaseline: 0.75
  },
  'haiku': {
    name: 'Claude Haiku 4.5',
    costPer1kTokens: 0.004, // $4/M output
    complexityLimit: 7,
    bestFor: ['code review', 'debugging', 'marketing copy', 'compliance docs'],
    avgLatency: '3s',
    successRateBaseline: 0.85
  },
  'sonnet': {
    name: 'Claude Sonnet 4.5',
    costPer1kTokens: 0.015, // $15/M output
    complexityLimit: 9,
    bestFor: ['complex refactoring', 'architecture', 'AI prompts', 'integrations'],
    avgLatency: '5s',
    successRateBaseline: 0.90
  },
  'opus': {
    name: 'Claude Opus 4.6',
    costPer1kTokens: 0.075, // $75/M output
    complexityLimit: 10,
    bestFor: ['security audits', 'production design', 'novel algorithms'],
    avgLatency: '8s',
    successRateBaseline: 0.95,
    requiresApproval: true
  }
}

interface Task {
  id: string
  description: string
  acceptanceCriteria: string[]
  estimatedComplexity?: number
  domain?: string
}

interface ModelHistory {
  model: string
  attempts: number
  successes: number
  avgTokens: number
  avgTime: number
}

interface SelectionLog {
  timestamp: string
  taskId: string
  taskDescription: string
  selectedModel: string
  complexity: number
  reason: string
  estimatedCost: number
  escalatedFrom?: string
}

// Complexity scoring function
function assessComplexity(task: Task): number {
  let score = 5 // Default medium
  
  const description = task.description.toLowerCase()
  const criteria = task.acceptanceCriteria.join(' ').toLowerCase()
  
  // Keywords that increase complexity
  const complexityIndicators = [
    { pattern: /security|audit|crypto|auth/i, boost: 3 },
    { pattern: /architecture|design|refactor/i, boost: 2 },
    { pattern: /integration|webhook|api/i, boost: 2 },
    { pattern: /debug|troubleshoot|fix.*bug/i, boost: 1.5 },
    { pattern: /novel|unique|custom/i, boost: 2 },
    { pattern: /test|validation|compliance/i, boost: 1 },
    { pattern: /documentation|summary|explain/i, boost: -1 },
    { pattern: /simple|basic|minor|tweak/i, boost: -2 }
  ]
  
  for (const indicator of complexityIndicators) {
    if (indicator.pattern.test(description) || indicator.pattern.test(criteria)) {
      score += indicator.boost
    }
  }
  
  // Acceptance criteria count
  if (task.acceptanceCriteria.length > 5) score += 1
  if (task.acceptanceCriteria.length > 8) score += 1
  
  // Domain expertise needed
  const complexDomains = ['security', 'ai', 'integration', 'performance']
  if (task.domain && complexDomains.includes(task.domain)) {
    score += 1
  }
  
  // Clamp to 1-10
  return Math.max(1, Math.min(10, score))
}

// Select initial model
export function selectInitialModel(task: Task): { model: string; reason: string; complexity: number } {
  const complexity = task.estimatedComplexity || assessComplexity(task)
  
  // Start with cheapest model that can handle the complexity
  for (const [key, model] of Object.entries(MODELS)) {
    if (model.complexityLimit >= complexity && !model.requiresApproval) {
      return {
        model: key,
        reason: `Complexity ${complexity}/10. ${model.name} can handle up to ${model.complexityLimit}. Starting with cheapest viable option.`,
        complexity
      }
    }
  }
  
  // Fallback to most capable (shouldn't reach here for normal tasks)
  return {
    model: 'sonnet',
    reason: `Complexity ${complexity}/10 exceeds Qwen/Haiku limits. Using Sonnet.`,
    complexity
  }
}

// Decide if we should escalate after seeing result
export function shouldEscalate(
  result: { success: boolean; quality: number; retryCount: number },
  currentModel: string,
  complexity: number
): { escalate: boolean; nextModel?: string; reason: string } {
  const modelInfo = MODELS[currentModel as keyof typeof MODELS]
  
  // If succeeded with good quality, no escalation
  if (result.success && result.quality >= 4) {
    return { escalate: false, reason: 'Task completed successfully with good quality.' }
  }
  
  // If failed and we have retries left on same model
  if (!result.success && result.retryCount < 2) {
    return { escalate: false, reason: `Retry ${result.retryCount + 1}/3 with same model.` }
  }
  
  // If failed after retries, escalate to next model
  const modelOrder = ['qwen3-next', 'haiku', 'sonnet', 'opus']
  const currentIndex = modelOrder.indexOf(currentModel)
  
  if (currentIndex < modelOrder.length - 1) {
    const nextModel = modelOrder[currentIndex + 1]
    return {
      escalate: true,
      nextModel,
      reason: `${currentModel} failed after ${result.retryCount} retries. Escalating to ${nextModel}.`
    }
  }
  
  // Maxed out, escalate to human
  return { escalate: false, reason: 'All models exhausted. Escalating to human.' }
}

// Log selection for dashboard metrics
export function logSelection(log: SelectionLog) {
  const entry = JSON.stringify(log) + '\n'
  fs.appendFileSync(MODEL_LOG_FILE, entry)
}

// Get model performance stats for dashboard
export function getModelStats(): Record<string, ModelHistory> {
  if (!fs.existsSync(MODEL_LOG_FILE)) {
    return {}
  }
  
  const lines = fs.readFileSync(MODEL_LOG_FILE, 'utf-8').trim().split('\n')
  const stats: Record<string, ModelHistory> = {}
  
  for (const line of lines) {
    try {
      const log = JSON.parse(line)
      if (!stats[log.selectedModel]) {
        stats[log.selectedModel] = {
          model: log.selectedModel,
          attempts: 0,
          successes: 0,
          avgTokens: 0,
          avgTime: 0
        }
      }
      stats[log.selectedModel].attempts++
    } catch {
      // Skip malformed lines
    }
  }
  
  return stats
}

// Export model configs for dashboard
export function getModelConfigs() {
  return MODELS
}

// CLI usage
if (require.main === module) {
  // Test with sample task
  const testTask: Task = {
    id: 'test-001',
    description: 'Fix outbound message storage in Supabase webhook',
    acceptanceCriteria: [
      'Outbound messages stored in Supabase',
      'Dashboard shows full conversation',
      'Error handling implemented',
      'Tests pass'
    ],
    domain: 'integration'
  }
  
  const selection = selectInitialModel(testTask)
  console.log('Task:', testTask.description)
  console.log('Complexity:', selection.complexity)
  console.log('Selected Model:', selection.model)
  console.log('Reason:', selection.reason)
  
  // Log it
  logSelection({
    timestamp: new Date().toISOString(),
    taskId: testTask.id,
    taskDescription: testTask.description,
    selectedModel: selection.model,
    complexity: selection.complexity,
    reason: selection.reason,
    estimatedCost: 0
  })
  
  console.log('\nStats:', getModelStats())
}
