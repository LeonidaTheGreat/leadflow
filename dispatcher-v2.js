#!/usr/bin/env node
/**
 * Autonomous Dispatcher v2 - Database-backed 8/10 Autonomy
 * 
 * Features:
 * - Uses TaskStore (Supabase) for persistent tasks
 * - Real-time unblocking via subscriptions
 * - Capability-based agent/model selection
 * - Event-driven dispatch
 * - Cost-aware spawning
 * 
 * Run: node dispatcher-v2.js
 */

const { TaskStore } = require('./task-store')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Configuration - reads from environment or uses defaults
const CONFIG = {
  dailyBudget: parseFloat(process.env.DAILY_BUDGET) || 5.00,
  maxConcurrent: parseInt(process.env.MAX_CONCURRENT) || 5,
  projectId: process.env.PROJECT_ID || 'bo2026',
  quietHours: { start: 0, end: 6 }, // Midnight to 6am
  
  // Auto-escalation settings
  autoEscalateBudget: process.env.AUTO_ESCALATE_BUDGET === 'true' || false,
  escalationThreshold: parseFloat(process.env.ESCALATION_THRESHOLD) || 10.00
}

// Model costs per hour
const MODEL_COSTS = {
  'qwen': 0.00,
  'kimi': 0.30,
  'haiku': 0.50,
  'sonnet': 2.00,
  'opus': 8.00
}

// Agent capabilities
const AGENT_CAPS = {
  'dev': { skills: ['coding', 'debugging', 'architecture'], preferredModels: ['qwen', 'kimi', 'sonnet'] },
  'marketing': { skills: ['copywriting', 'research', 'strategy'], preferredModels: ['kimi', 'haiku'] },
  'design': { skills: ['ui', 'ux', 'branding'], preferredModels: ['kimi', 'haiku'] },
  'qc': { skills: ['testing', 'compliance', 'review'], preferredModels: ['haiku', 'sonnet'] },
  'analytics': { skills: ['sql', 'metrics', 'modeling'], preferredModels: ['kimi', 'haiku'] }
}

class AutonomousDispatcher {
  constructor() {
    this.store = new TaskStore()
    this.isRunning = false
    this.activeSpawns = new Map()
    
    // Track daily spend
    this.dailySpend = 0
    this.lastBudgetCheck = null
  }
  
  async initialize() {
    console.log('🤖 Autonomous Dispatcher v2 (8/10)')
    console.log('====================================')
    
    // Load today's spend
    await this.updateBudgetStatus()
    
    // Subscribe to real-time changes
    this.store.subscribeToChanges((payload) => {
      this.handleTaskChange(payload)
    })
    
    console.log('✅ Real-time subscriptions active')
    console.log('')
  }
  
  async updateBudgetStatus() {
    const today = new Date().toISOString().split('T')[0]
    
    if (this.lastBudgetCheck !== today) {
      this.dailySpend = await this.store.getDailySpend(today)
      this.lastBudgetCheck = today
      console.log(`💰 Budget: $${this.dailySpend.toFixed(2)} / $${CONFIG.dailyBudget}`)
    }
    
    return this.dailySpend
  }
  
  async run() {
    if (this.isRunning) {
      console.log('⏳ Dispatcher already running')
      return
    }
    
    this.isRunning = true
    
    try {
      // Check quiet hours
      if (this.isQuietHours()) {
        console.log('⏸️  Quiet hours (0-6am). Pausing.')
        return
      }
      
      // Update budget
      await this.updateBudgetStatus()
      
      // Check if budget exhausted
      if (this.dailySpend >= CONFIG.dailyBudget) {
        console.log('🔴 Daily budget exhausted. Stopping.')
        return
      }
      
      // Check concurrency
      const activeCount = this.activeSpawns.size
      if (activeCount >= CONFIG.maxConcurrent) {
        console.log(`⏸️  Max concurrent agents (${activeCount}/${CONFIG.maxConcurrent})`)
        return
      }
      
      // Get ready tasks (dependencies met)
      const readyTasks = await this.store.getReadyTasks()
      
      if (readyTasks.length === 0) {
        console.log('⏳ No ready tasks found')
        return
      }
      
      console.log(`📋 Found ${readyTasks.length} ready tasks`)
      
      // Score and filter tasks
      const spawnable = await this.selectTasksToSpawn(readyTasks)
      
      if (spawnable.length === 0) {
        console.log('⏳ No tasks within budget')
        return
      }
      
      // Spawn top candidates
      const toSpawn = Math.min(
        spawnable.length,
        CONFIG.maxConcurrent - activeCount
      )
      
      for (let i = 0; i < toSpawn; i++) {
        await this.spawnTask(spawnable[i])
      }
      
    } finally {
      this.isRunning = false
    }
  }
  
  async selectTasksToSpawn(tasks) {
    const spawnable = []
    const remainingBudget = CONFIG.dailyBudget - this.dailySpend
    
    for (const task of tasks) {
      // Score task by priority and impact
      const score = this.scoreTask(task)
      
      // Check if within budget (with auto-downgrade)
      let cost = task.estimated_cost_usd || this.estimateCost(task)
      let model = task.model
      
      // AUTO-DOWNGRADE: If over budget, try cheaper models
      if (cost > remainingBudget) {
        const downgraded = this.autoDowngradeModel(task, remainingBudget)
        if (downgraded) {
          model = downgraded.model
          cost = downgraded.cost
          console.log(`  🔽 ${task.title}: Downgraded ${task.model} → ${model} ($${cost.toFixed(2)})`)
        } else {
          console.log(`  ⛔ ${task.title}: $${cost.toFixed(2)} exceeds budget (cannot downgrade further)`)
          continue
        }
      }
      
      spawnable.push({
        ...task,
        score,
        estimatedCost: cost,
        model: model  // Use potentially downgraded model
      })
    }
    
    // Sort by score (highest first)
    spawnable.sort((a, b) => b.score - a.score)
    
    return spawnable
  }
  
  autoDowngradeModel(task, remainingBudget) {
    // Try progressively cheaper models
    const downgradePath = ['sonnet', 'haiku', 'kimi', 'qwen']
    const currentIndex = downgradePath.indexOf(task.model)
    const hours = task.estimated_hours || 1
    
    // Start from current model and try cheaper ones
    for (let i = Math.max(0, currentIndex); i < downgradePath.length; i++) {
      const tryModel = downgradePath[i]
      const tryCost = MODEL_COSTS[tryModel] * hours
      
      if (tryCost <= remainingBudget) {
        return { model: tryModel, cost: tryCost }
      }
    }
    
    // If even Qwen is too much (shouldn't happen), return null
    return null
  }
  
  scoreTask(task) {
    let score = 0
    
    // Priority score (1-5, lower is higher priority)
    score += (6 - task.priority) * 100
    
    // Urgency bonus for old tasks
    const age = Date.now() - new Date(task.created_at).getTime()
    const ageDays = age / (1000 * 60 * 60 * 24)
    score += ageDays * 10
    
    // Retry penalty (don't prioritize failing tasks)
    score -= (task.retry_count || 0) * 20
    
    return score
  }
  
  estimateCost(task) {
    const model = task.model || 'kimi'
    const hours = task.estimated_hours || 1
    const rate = MODEL_COSTS[model] || 1.00
    return rate * hours
  }
  
  async spawnTask(task) {
    console.log(`\n🚀 Spawning: ${task.title}`)
    console.log(`   Agent: ${task.agent_id} | Model: ${task.model}`)
    console.log(`   Est. Cost: $${task.estimatedCost.toFixed(2)}`)
    
    // Select optimal model if not specified
    const model = task.model || this.selectOptimalModel(task.agent_id, task.complexity)
    
    // Build spawn config
    const spawnConfig = {
      task: task.title,
      agentId: task.agent_id,
      model: model,
      prompt: this.buildPrompt(task),
      timeout: (task.estimated_hours || 1) * 3600,
      taskId: task.id,
      priority: task.priority
    }
    
    // Write spawn config
    fs.writeFileSync('.spawn-config.json', JSON.stringify(spawnConfig, null, 2))
    
    // Update task status
    await this.store.updateTask(task.id, {
      status: 'in_progress',
      started_at: new Date().toISOString(),
      model: model,
      spawn_config: spawnConfig
    })
    
    // Track active spawn
    this.activeSpawns.set(task.id, {
      started: Date.now(),
      task: task
    })
    
    // Trigger pipeline
    console.log('   Triggering pipeline...')
    const child = spawn('node', ['pipeline-8-10.js'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    
    child.on('close', (code) => {
      console.log(`   Task ${task.id} pipeline exited: ${code}`)
      this.activeSpawns.delete(task.id)
      
      // Handle completion
      this.handleTaskComplete(task.id, code === 0)
    })
    
    child.unref()
  }
  
  selectOptimalModel(agentId, complexity = 'medium') {
    const caps = AGENT_CAPS[agentId]
    if (!caps) return 'kimi'
    
    const tierMap = {
      'simple': ['qwen', 'kimi'],
      'medium': ['kimi', 'haiku'],
      'complex': ['haiku', 'sonnet']
    }
    
    const candidates = tierMap[complexity] || ['kimi']
    const remainingBudget = CONFIG.dailyBudget - this.dailySpend
    
    // Pick first affordable model
    for (const model of candidates) {
      if (MODEL_COSTS[model] <= remainingBudget) {
        return model
      }
    }
    
    return 'kimi' // Fallback
  }
  
  buildPrompt(task) {
    const criteria = task.acceptance_criteria || []
    
    return `Task: ${task.title}

Description: ${task.description || 'No description'}

Priority: P${task.priority}
Estimated Time: ${task.estimated_hours || 1} hours

Acceptance Criteria:
${criteria.map(c => `- [ ] ${c}`).join('\n')}

Success Criteria:
- All tests pass
- Code deployed (if applicable)
- Changes documented
- Status updated in task tracker

Task ID: ${task.id}

Go!`
  }
  
  async handleTaskChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    if (eventType === 'UPDATE' && newRecord.status === 'done' && oldRecord.status !== 'done') {
      console.log(`\n✅ Task completed: ${newRecord.title}`)
      
      // Record outcome for learning
      await this.recordOutcome(newRecord)
      
      // Budget update
      this.dailySpend += newRecord.actual_cost_usd || 0
      
      // Check for newly unblocked tasks
      // (Handled by database trigger, but we can also run)
      await this.store.checkUnblockedTasks(newRecord.id)
      
      // Trigger next dispatch cycle
      setTimeout(() => this.run(), 1000)
    }
  }
  
  async handleTaskComplete(taskId, success) {
    const task = await this.store.getTask(taskId)
    if (!task) return
    
    if (success) {
      console.log(`✅ Task ${taskId} completed successfully`)
    } else {
      console.log(`❌ Task ${taskId} failed`)
      
      // Increment retry count
      const retries = (task.retry_count || 0) + 1
      
      if (retries < (task.max_retries || 3)) {
        // Retry with escalated model
        const nextModel = this.escalateModel(task.model)
        
        await this.store.updateTask(taskId, {
          status: 'ready', // Back to ready for retry
          retry_count: retries,
          model: nextModel,
          last_error: 'Failed pipeline execution'
        })
        
        console.log(`   🔄 Retry ${retries} with ${nextModel}`)
      } else {
        // Max retries exceeded
        await this.store.updateTask(taskId, {
          status: 'failed',
          last_error: 'Max retries exceeded'
        })
        
        this.escalateToHuman(task)
      }
    }
  }
  
  escalateModel(currentModel) {
    const escalation = {
      'qwen': 'kimi',
      'kimi': 'haiku',
      'haiku': 'sonnet',
      'sonnet': 'opus',
      'opus': 'human'
    }
    return escalation[currentModel] || 'human'
  }
  
  async recordOutcome(task) {
    const duration = task.started_at && task.completed_at
      ? Math.round((new Date(task.completed_at) - new Date(task.started_at)) / 60000)
      : 0
    
    await this.store.recordOutcome(task.id, {
      success: task.status === 'done',
      durationMinutes: duration,
      costUsd: task.actual_cost_usd || 0,
      errorType: task.last_error ? this.classifyError(task.last_error) : null
    })
  }
  
  classifyError(error) {
    if (error.includes('build') || error.includes('compile')) return 'build_error'
    if (error.includes('test')) return 'test_failure'
    if (error.includes('timeout')) return 'timeout'
    if (error.includes('network') || error.includes('connection')) return 'network_error'
    return 'unknown'
  }
  
  escalateToHuman(task) {
    console.log(`\n📤 ESCALATING TO HUMAN: ${task.title}`)
    
    const escalation = {
      timestamp: new Date().toISOString(),
      type: 'max_retries_exceeded',
      task: task,
      action: 'human_intervention_required'
    }
    
    fs.writeFileSync('escalation-pending.json', JSON.stringify(escalation, null, 2))
  }
  
  isQuietHours() {
    const hour = new Date().getHours()
    return hour >= CONFIG.quietHours.start && hour < CONFIG.quietHours.end
  }
  
  // ============== Utility Methods ==============
  
  async importFromHardcoded(tasks) {
    console.log(`\n📥 Importing ${tasks.length} hardcoded tasks...`)
    
    for (const task of tasks) {
      const created = await this.store.createTask({
        title: task.name,
        agentId: task.spawnConfig?.agentId,
        model: task.spawnConfig?.model,
        priority: task.priority === 'P0' ? 1 : task.priority === 'P1' ? 2 : 3,
        status: task.status === 'ready' ? 'ready' : task.status === 'blocked' ? 'blocked' : 'backlog',
        estimatedHours: task.estimatedMinutes / 60,
        description: `Impact: ${task.impact}. Unblocks: ${task.unblocks?.join(', ') || 'none'}`,
        acceptanceCriteria: ['Complete task', 'Pass tests', 'Update status']
      })
      
      console.log(`   Created: ${created.title} (${created.id})`)
    }
    
    console.log('✅ Import complete\n')
  }
  
  async getStats() {
    const allTasks = await this.store.getTasks({ projectId: CONFIG.projectId })
    
    return {
      total: allTasks.length,
      byStatus: {
        backlog: allTasks.filter(t => t.status === 'backlog').length,
        ready: allTasks.filter(t => t.status === 'ready').length,
        in_progress: allTasks.filter(t => t.status === 'in_progress').length,
        done: allTasks.filter(t => t.status === 'done').length,
        blocked: allTasks.filter(t => t.status === 'blocked').length,
        failed: allTasks.filter(t => t.status === 'failed').length
      },
      dailySpend: this.dailySpend,
      budgetRemaining: CONFIG.dailyBudget - this.dailySpend
    }
  }
}

// ============== CLI Interface ==============

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  const dispatcher = new AutonomousDispatcher()
  await dispatcher.initialize()
  
  switch (command) {
    case 'run':
      await dispatcher.run()
      break
      
    case 'watch':
      console.log('👁️  Running in watch mode (continuous)...')
      await dispatcher.run()
      
      // Run every 2 minutes
      setInterval(() => dispatcher.run(), 120000)
      
      // Keep alive
      console.log('Press Ctrl+C to stop')
      process.stdin.resume()
      break
      
    case 'import':
      // Import hardcoded tasks from task-dispatcher.ts
      const hardcodedTasks = [
        {
          name: 'Agent Onboarding UI',
          priority: 'P0',
          status: 'ready',
          estimatedMinutes: 240,
          spawnConfig: { agentId: 'dev', model: 'sonnet' }
        },
        {
          name: 'Cal.com Booking Links',
          priority: 'P0',
          status: 'ready',
          estimatedMinutes: 180,
          spawnConfig: { agentId: 'dev', model: 'sonnet' }
        }
      ]
      await dispatcher.importFromHardcoded(hardcodedTasks)
      break
      
    case 'stats':
      const stats = await dispatcher.getStats()
      console.log('\n📊 Dispatcher Stats')
      console.log('===================')
      console.log(`Total Tasks: ${stats.total}`)
      console.log('By Status:')
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`)
      })
      console.log(`\nBudget: $${stats.dailySpend.toFixed(2)} / $${CONFIG.dailyBudget}`)
      console.log(`Remaining: $${stats.budgetRemaining.toFixed(2)}`)
      break
      
    default:
      console.log('Usage:')
      console.log('  node dispatcher-v2.js run     - Run once')
      console.log('  node dispatcher-v2.js watch   - Run continuously')
      console.log('  node dispatcher-v2.js import  - Import hardcoded tasks')
      console.log('  node dispatcher-v2.js stats   - Show stats')
  }
  
  process.exit(0)
}

if (require.main === module) {
  main().catch(error => {
    console.error('Dispatcher error:', error)
    process.exit(1)
  })
}

module.exports = { AutonomousDispatcher }
