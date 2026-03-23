#!/usr/bin/env node

/**
 * Orchestrator Bridge - TOOL for Orchestrator Agent
 * 
 * THIS IS NOT AN AGENT - it's a tool the Orchestrator Agent uses.
 * 
 * The Orchestrator Agent (in Discord) calls this script to:
 * 1. Execute decomposition decisions
 * 2. Send Discord notifications
 * 3. Prepare retry configurations
 * 4. Create escalation files
 * 
 * The Orchestrator Agent DECIDES, this script EXECUTES.
 * 
 * Usage (called by Orchestrator Agent):
 *   node orchestrator-bridge.js --handle-failure <task-id>
 *   node orchestrator-bridge.js --decompose <task-id>
 *   node orchestrator-bridge.js --escalate <task-id>
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Load TaskStore
const { TaskStore } = require('./task-store')

// Configuration
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL || null
const MAX_DECOMPOSABLE_COMPLEXITY = 6 // Hours
const DECOMPOSE_AFTER_FAILURES = 2 // Decompose after 2 failures

class OrchestratorBridge {
  constructor() {
    this.store = new TaskStore()
    this.subscriber = null
  }

  /**
   * Main entry: Handle test failure for a task
   */
  async handleTestFailure(taskId, testResults) {
    console.log(`\n🔔 Orchestrator: Handling test failure for ${taskId}`)
    
    // Load task details
    const task = await this.store.getTask(taskId)
    if (!task) {
      console.error(`❌ Task ${taskId} not found`)
      return
    }

    // Load failure history
    const failureCount = await this.getFailureCount(taskId)
    
    // Decision tree
    const decision = await this.makeDecision(task, failureCount, testResults)
    
    console.log(`\n📊 Decision: ${decision.action.toUpperCase()}`)
    console.log(`   Reason: ${decision.reason}`)
    
    // Execute decision
    switch (decision.action) {
      case 'retry':
        await this.handleRetry(task, testResults)
        break
      case 'decompose':
        await this.handleDecomposition(task, testResults)
        break
      case 'escalate':
        await this.handleEscalation(task, testResults, decision)
        break
      default:
        console.log('   No action taken')
    }
    
    // Always notify
    await this.notifyDiscord(task, decision, testResults)
    
    return decision
  }

  /**
   * Decision engine: What should we do?
   */
  async makeDecision(task, failureCount, testResults) {
    const estimatedHours = task.estimated_hours || 4
    const hasAcceptanceCriteria = (task.acceptance_criteria || []).length > 0
    
    // Decision 1: Decompose if large and failed multiple times
    if (failureCount >= DECOMPOSE_AFTER_FAILURES && estimatedHours > 3) {
      return {
        action: 'decompose',
        reason: `Task failed ${failureCount} times and is ${estimatedHours}h (complex). Breaking into smaller pieces.`,
        confidence: 'high'
      }
    }
    
    // Decision 2: Retry with better model if under max retries
    if (failureCount < 3) {
      const nextModel = this.getNextModel(task.model)
      if (nextModel !== 'human') {
        return {
          action: 'retry',
          reason: `Failure ${failureCount}/3. Escalating model ${task.model} → ${nextModel}`,
          nextModel,
          confidence: 'medium'
        }
      }
    }
    
    // Decision 3: Escalate to human
    return {
      action: 'escalate',
      reason: failureCount >= 3 
        ? 'Max retries exceeded'
        : 'Already at max model (Opus)',
      options: [
        'Manual retry with Opus',
        'Decompose into smaller tasks',
        'Reassign to different agent',
        'Mark as blocked (needs clarification)'
      ],
      confidence: 'low'
    }
  }

  /**
   * Handle retry: Trigger failure-recovery
   */
  async handleRetry(task, testResults) {
    console.log('   🔄 Triggering retry via failure-recovery.js')
    
    try {
      // Write spawn config for failure-recovery
      const spawnConfig = {
        task: task.id,
        agentId: task.agent_id,
        model: task.model,
        prompt: task.description,
        timeout: (task.estimated_hours || 1) * 3600
      }
      
      fs.writeFileSync('.spawn-config.json', JSON.stringify(spawnConfig, null, 2))
      
      // Call failure-recovery
      const result = execSync(
        `node failure-recovery.js fail "${testResults.failedTests?.[0]?.error || 'Test failed'}"`,
        { encoding: 'utf-8' }
      )
      
      console.log('   ✅ Retry prepared')
      
      // Update task metadata
      await this.store.updateTask(task.id, {
        metadata: {
          ...task.metadata,
          retry_scheduled: true,
          last_failure: new Date().toISOString(),
          failure_count: (task.metadata?.failure_count || 0) + 1
        }
      })
      
    } catch (error) {
      console.error('   ❌ Retry preparation failed:', error.message)
    }
  }

  /**
   * Handle decomposition: Break task into subtasks
   */
  async handleDecomposition(task, testResults) {
    console.log('   ✂️  Decomposing task into subtasks')
    
    const subtasks = await this.generateSubtasks(task, testResults)
    
    console.log(`   Generated ${subtasks.length} subtasks:`)
    
    // Create subtasks in database
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i]
      
      console.log(`     ${i + 1}. ${subtask.title} (${subtask.estimatedHours}h)`)
      
      const newTask = await this.store.createTask({
        title: subtask.title,
        description: subtask.description,
        acceptance_criteria: subtask.acceptanceCriteria,
        agent_id: subtask.agentId,
        model: subtask.model,
        priority: task.priority,
        estimated_hours: subtask.estimatedHours,
        estimated_cost_usd: subtask.estimatedCost,
        parent_task_id: task.id, // Link to parent
        status: i === 0 ? 'ready' : 'blocked', // First ready, rest blocked
        tags: [...(task.tags || []), 'decomposed'],
        metadata: {
          decomposed_from: task.id,
          decomposition_reason: 'Multiple test failures',
          original_complexity: task.estimated_hours
        }
      })
      
      // Add dependency: each subtask depends on previous
      if (i > 0) {
        await this.store.addDependency(newTask.id, subtasks[i - 1].id)
      }
    }
    
    // Mark original task as superseded
    await this.store.updateTask(task.id, {
      status: 'superseded',
      metadata: {
        ...task.metadata,
        superseded_by: 'decomposition',
        subtask_count: subtasks.length,
        decomposition_time: new Date().toISOString()
      }
    })
    
    console.log('   ✅ Decomposition complete')
    console.log(`   Original task ${task.id} marked as superseded`)
  }

  /**
   * Generate subtasks from failed task using LLM
   */
  async generateSubtasks(task, testResults) {
    // For now, use simple rule-based decomposition
    // In production, this would use LLM to analyze task + test failures
    
    const estimatedHours = task.estimated_hours || 4
    const numSubtasks = Math.ceil(estimatedHours / 2) // 2 hours per subtask
    
    const subtasks = []
    const agentId = task.agent_id || 'dev'
    
    // Parse what needs to be done from task description
    const description = task.description || ''
    const title = task.title || 'Task'
    
    // Common decomposition patterns
    if (description.toLowerCase().includes('dashboard') || title.toLowerCase().includes('dashboard')) {
      subtasks.push(
        {
          title: `${title} - Data Layer`,
          description: `Create data fetching and state management for ${title}`,
          acceptanceCriteria: ['API endpoints return correct data', 'State updates correctly'],
          agentId,
          model: 'kimi',
          estimatedHours: 1.5,
          estimatedCost: 0.45
        },
        {
          title: `${title} - UI Components`,
          description: `Build React components for ${title}`,
          acceptanceCriteria: ['Components render correctly', 'Props typed correctly', 'Responsive design'],
          agentId,
          model: 'kimi',
          estimatedHours: 1.5,
          estimatedCost: 0.45
        },
        {
          title: `${title} - Integration & Tests`,
          description: `Connect components to data and add tests for ${title}`,
          acceptanceCriteria: ['E2E tests pass', 'Data flows correctly', 'Error states handled'],
          agentId: 'qc',
          model: 'haiku',
          estimatedHours: 1,
          estimatedCost: 0.50
        }
      )
    } else if (description.toLowerCase().includes('api') || description.toLowerCase().includes('webhook')) {
      subtasks.push(
        {
          title: `${title} - Schema & Validation`,
          description: `Define request/response schemas and validation for ${title}`,
          acceptanceCriteria: ['Zod schemas defined', 'Validation middleware works'],
          agentId,
          model: 'kimi',
          estimatedHours: 1,
          estimatedCost: 0.30
        },
        {
          title: `${title} - Handler Implementation`,
          description: `Implement business logic for ${title}`,
          acceptanceCriteria: ['Handler processes requests', 'Error handling works', 'Logs correctly'],
          agentId,
          model: 'kimi',
          estimatedHours: 1.5,
          estimatedCost: 0.45
        },
        {
          title: `${title} - Tests & Documentation`,
          description: `Add tests and docs for ${title}`,
          acceptanceCriteria: ['Unit tests pass', 'Integration tests pass', 'API docs updated'],
          agentId,
          model: 'haiku',
          estimatedHours: 1,
          estimatedCost: 0.50
        }
      )
    } else {
      // Generic decomposition
      for (let i = 0; i < numSubtasks; i++) {
        subtasks.push({
          title: `${title} - Part ${i + 1}/${numSubtasks}`,
          description: `Complete part ${i + 1} of ${title}`,
          acceptanceCriteria: ['Part is functional', 'Tests pass'],
          agentId,
          model: 'kimi',
          estimatedHours: 2,
          estimatedCost: 0.60
        })
      }
    }
    
    return subtasks
  }

  /**
   * Handle human escalation
   */
  async handleEscalation(task, testResults, decision) {
    console.log('   📤 Escalating to human')
    
    const escalation = {
      timestamp: new Date().toISOString(),
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        agent: task.agent_id,
        model: task.model
      },
      testResults: {
        summary: testResults.summary,
        failedTests: testResults.tests?.filter(t => !t.success).map(t => ({
          name: t.name,
          error: t.error,
          suggestion: t.suggestion
        }))
      },
      decision,
      options: decision.options
    }
    
    fs.writeFileSync(
      `escalation-${task.id}.json`,
      JSON.stringify(escalation, null, 2)
    )
    
    // Mark task as blocked
    await this.store.updateTask(task.id, {
      status: 'blocked',
      blocked_reason: 'Awaiting human decision after max retries',
      metadata: {
        ...task.metadata,
        escalated_at: new Date().toISOString(),
        escalation_file: `escalation-${task.id}.json`
      }
    })
    
    console.log(`   📄 Escalation written to: escalation-${task.id}.json`)
  }

  /**
   * Send Discord notification
   */
  async notifyDiscord(task, decision, testResults) {
    if (!DISCORD_WEBHOOK) {
      console.log('   ⚠️  No Discord webhook configured, skipping notification')
      return
    }
    
    const color = decision.action === 'retry' ? 0x3498db :
                  decision.action === 'decompose' ? 0xf39c12 :
                  decision.action === 'escalate' ? 0xe74c3c : 0x95a5a6
    
    const payload = {
      embeds: [{
        title: `🧪 Test ${decision.action === 'retry' ? 'Retry' : 'Failure'}: ${task.title}`,
        color,
        fields: [
          {
            name: 'Task',
            value: `${task.title}\nID: ${task.id}`,
            inline: false
          },
          {
            name: 'Agent',
            value: task.agent_id || 'unassigned',
            inline: true
          },
          {
            name: 'Model',
            value: task.model || 'kimi',
            inline: true
          },
          {
            name: 'Decision',
            value: decision.action.toUpperCase(),
            inline: true
          },
          {
            name: 'Reason',
            value: decision.reason,
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'BO2026 Autonomous Agent Swarm'
        }
      }]
    }
    
    if (decision.action === 'escalate' && decision.options) {
      payload.embeds[0].fields.push({
        name: 'Options',
        value: decision.options.map((o, i) => `${i + 1}. ${o}`).join('\n'),
        inline: false
      })
    }
    
    try {
      execSync(`curl -X POST -H "Content-Type: application/json" -d '${JSON.stringify(payload)}' ${DISCORD_WEBHOOK}`, {
        stdio: 'ignore'
      })
      console.log('   ✅ Discord notification sent')
    } catch (error) {
      console.log('   ⚠️  Discord notification failed:', error.message)
    }
  }

  /**
   * Get failure count for task
   */
  async getFailureCount(taskId) {
    const task = await this.store.getTask(taskId)
    return task?.metadata?.failure_count || 0
  }

  /**
   * Get next model in escalation chain
   */
  getNextModel(currentModel) {
    const escalation = {
      'qwen': 'kimi',
      'kimi': 'haiku',
      'haiku': 'sonnet',
      'sonnet': 'opus',
      'opus': 'human'
    }
    return escalation[currentModel?.toLowerCase()] || 'kimi'
  }

  /**
   * Watch mode: Subscribe to Supabase changes
   */
  async watch() {
    console.log('👁️  Orchestrator Bridge: Watching for test failures...')
    
    this.subscriber = this.store.subscribeToChanges(async (payload) => {
      if (payload.eventType === 'UPDATE') {
        const newTask = payload.new
        const oldTask = payload.old
        
        // Detect test failure (status change or metadata update)
        if (newTask.metadata?.test_failed && !oldTask.metadata?.test_failed) {
          console.log(`\n🚨 Test failure detected: ${newTask.title}`)
          
          const testResults = newTask.metadata?.test_results
          await this.handleTestFailure(newTask.id, testResults)
        }
      }
    })
    
    console.log('   ✅ Watching for test failures (Press Ctrl+C to stop)')
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  const bridge = new OrchestratorBridge()
  
  if (args.includes('--watch')) {
    await bridge.watch()
  } else if (args.includes('--handle-failure')) {
    const taskId = args[args.indexOf('--handle-failure') + 1]
    const testResultsPath = args.includes('--results') 
      ? args[args.indexOf('--results') + 1] 
      : 'test-results.json'
    
    let testResults = {}
    try {
      testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf-8'))
    } catch (e) {}
    
    await bridge.handleTestFailure(taskId, testResults)
  } else {
    console.log(`
Orchestrator Bridge - Test Failure Handling

Usage:
  node orchestrator-bridge.js --watch
    Watch for test failures and auto-handle

  node orchestrator-bridge.js --handle-failure <task-id> [--results <path>]
    Handle a specific test failure

Environment:
  DISCORD_WEBHOOK_URL - Discord webhook for notifications
    `)
  }
}

main().catch(console.error)
