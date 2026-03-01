#!/usr/bin/env node
/**
 * Dynamic Model Orchestrator
 * 
 * Spawns agents with automatic model selection.
 * Tracks performance and escalates if needed.
 */

import { selectInitialModel, shouldEscalate, logSelection, getModelStats } from '../lib/model-selector'
import * as fs from 'fs'
import * as path from 'path'

const BO2026_ROOT = '/Users/clawdbot/.openclaw/workspace/business-opportunities-2026'
const SPAWN_LOG = path.join(BO2026_ROOT, 'spawn-log.jsonl')

interface AgentTask {
  id: string
  agentType: 'dev' | 'marketing' | 'design' | 'qc' | 'analytics'
  description: string
  acceptanceCriteria: string[]
  estimatedComplexity?: number
  domain?: string
  timeoutMinutes?: number
}

interface SpawnRecord {
  timestamp: string
  taskId: string
  agentType: string
  initialModel: string
  finalModel: string
  escalations: number
  success: boolean
  cost: number
  durationMinutes: number
  qualityScore: number // 1-5
}

// Main spawn function with dynamic model selection
export async function spawnAgentWithDynamicModel(task: AgentTask): Promise<SpawnRecord> {
  console.log(`🚀 Spawning ${task.agentType} for task: ${task.id}`)
  
  // Step 1: Select initial model
  const selection = selectInitialModel({
    id: task.id,
    description: task.description,
    acceptanceCriteria: task.acceptanceCriteria,
    estimatedComplexity: task.estimatedComplexity,
    domain: task.domain
  })
  
  console.log(`  Complexity: ${selection.complexity}/10`)
  console.log(`  Initial model: ${selection.model}`)
  console.log(`  Reason: ${selection.reason}`)
  
  // Log the selection
  logSelection({
    timestamp: new Date().toISOString(),
    taskId: task.id,
    taskDescription: task.description,
    selectedModel: selection.model,
    complexity: selection.complexity,
    reason: selection.reason,
    estimatedCost: 0
  })
  
  // Step 2: Spawn with initial model (would integrate with sessions_spawn)
  let currentModel = selection.model
  let escalations = 0
  let finalSuccess = false
  let retryCount = 0
  
  // Simulate spawn logic (actual implementation would call sessions_spawn)
  const spawnResult = {
    runId: `run-${Date.now()}`,
    sessionKey: `agent:main:subagent:${Date.now()}`,
    model: currentModel
  }
  
  console.log(`  Spawned: ${spawnResult.runId}`)
  console.log(`  Session: ${spawnResult.sessionKey}`)
  
  // Step 3: Monitor and potentially escalate
  // In real implementation, this would poll subagents status
  // For now, we log the spawn and return
  
  const record: SpawnRecord = {
    timestamp: new Date().toISOString(),
    taskId: task.id,
    agentType: task.agentType,
    initialModel: selection.model,
    finalModel: currentModel,
    escalations,
    success: false, // Will update when agent completes
    cost: 0,
    durationMinutes: 0,
    qualityScore: 0
  }
  
  // Write spawn config for actual execution
  const spawnConfigPath = path.join(BO2026_ROOT, '.spawn-pending', `${task.id}.json`)
  fs.mkdirSync(path.dirname(spawnConfigPath), { recursive: true })
  fs.writeFileSync(spawnConfigPath, JSON.stringify({
    task,
    model: currentModel,
    complexity: selection.complexity,
    spawnResult,
    record
  }, null, 2))
  
  console.log(`  Config written: ${spawnConfigPath}`)
  console.log('  Agent will auto-announce on completion\n')
  
  return record
}

// Update spawn record when agent completes
export function updateSpawnRecord(
  taskId: string, 
  updates: Partial<SpawnRecord>
): void {
  const configPath = path.join(BO2026_ROOT, '.spawn-pending', `${taskId}.json`)
  
  if (!fs.existsSync(configPath)) {
    console.warn(`No pending spawn record for ${taskId}`)
    return
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  config.record = { ...config.record, ...updates }
  
  // Log to spawn log
  const logEntry = JSON.stringify(config.record) + '\n'
  fs.appendFileSync(SPAWN_LOG, logEntry)
  
  // Clean up pending config
  fs.unlinkSync(configPath)
  
  console.log(`✅ Updated spawn record for ${taskId}`)
}

// Check if we should escalate a running agent
export function checkAndEscalateIfNeeded(taskId: string): void {
  const configPath = path.join(BO2026_ROOT, '.spawn-pending', `${taskId}.json`)
  
  if (!fs.existsSync(configPath)) return
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  
  // Check escalation logic
  const escalation = shouldEscalate(
    { success: false, quality: 0, retryCount: config.record.escalations },
    config.model,
    config.complexity
  )
  
  if (escalation.escalate && escalation.nextModel) {
    console.log(`⬆️ Escalating ${taskId} from ${config.model} to ${escalation.nextModel}`)
    console.log(`  Reason: ${escalation.reason}`)
    
    // Update config with new model
    config.model = escalation.nextModel
    config.record.escalations++
    config.record.finalModel = escalation.nextModel
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    
    // In real implementation: kill current agent, respawn with new model
    console.log(`  Would respawn with ${escalation.nextModel}`)
  }
}

// Generate dashboard metrics
export function generateModelMetrics(): object {
  const stats = getModelStats()
  const spawns = fs.existsSync(SPAWN_LOG) 
    ? fs.readFileSync(SPAWN_LOG, 'utf-8').trim().split('\n').filter(Boolean)
    : []
  
  const spawnData = spawns.map(line => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)
  
  return {
    summary: {
      totalSpawns: spawnData.length,
      successfulSpawns: spawnData.filter((s: any) => s.success).length,
      avgEscalations: spawnData.length > 0 
        ? spawnData.reduce((a: number, s: any) => a + s.escalations, 0) / spawnData.length 
        : 0,
      totalCost: spawnData.reduce((a: number, s: any) => a + (s.cost || 0), 0)
    },
    byModel: Object.fromEntries(
      Object.entries(stats).map(([model, data]) => {
        const modelSpawns = spawnData.filter((s: any) => s.initialModel === model)
        return [model, {
          ...data,
          spawns: modelSpawns.length,
          successRate: modelSpawns.length > 0
            ? modelSpawns.filter((s: any) => s.success).length / modelSpawns.length
            : 0
        }]
      })
    ),
    recommendations: generateRecommendations(spawnData)
  }
}

function generateRecommendations(spawns: any[]): string[] {
  const recommendations: string[] = []
  
  // Check if Qwen is performing well enough
  const qwenSpawns = spawns.filter(s => s.initialModel === 'qwen3-next')
  if (qwenSpawns.length > 5) {
    const qwenSuccessRate = qwenSpawns.filter(s => s.success).length / qwenSpawns.length
    if (qwenSuccessRate > 0.8) {
      recommendations.push('Qwen3-Next showing 80%+ success rate. Consider expanding its use for more task types to save costs.')
    }
    if (qwenSuccessRate < 0.6) {
      recommendations.push('Qwen3-Next success rate below 60%. Consider defaulting to Haiku for better reliability.')
    }
  }
  
  // Check escalation patterns
  const highEscalationTasks = spawns.filter(s => s.escalations > 1)
  if (highEscalationTasks.length > 3) {
    recommendations.push(`${highEscalationTasks.length} tasks required multiple escalations. Review complexity assessment algorithm.`)
  }
  
  // Cost optimization
  const expensiveTasks = spawns.filter(s => s.cost > 2)
  if (expensiveTasks.length > 5) {
    recommendations.push(`${expensiveTasks.length} high-cost tasks detected. Consider Qwen-first approach for non-critical tasks.`)
  }
  
  return recommendations
}

// CLI usage
if (require.main === module) {
  console.log('🤖 Dynamic Model Orchestrator\n')
  
  // Show current metrics
  const metrics = generateModelMetrics()
  console.log('Current Metrics:')
  console.log(JSON.stringify(metrics, null, 2))
  
  // Test spawn
  console.log('\n--- Test Spawn ---\n')
  spawnAgentWithDynamicModel({
    id: 'marketing-001',
    agentType: 'marketing',
    description: 'Recruit 3-5 pilot agents for LeadFlow AI',
    acceptanceCriteria: [
      'Identify 20+ potential agents',
      'Send personalized outreach messages',
      'Get 3-5 positive responses',
      'Schedule demo calls'
    ],
    domain: 'marketing',
    estimatedComplexity: 5
  })
}
