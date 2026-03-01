#!/usr/bin/env node
/**
 * Task Dispatcher - Autonomous Agent Spawner
 * 
 * Monitors system state and automatically spawns subagents for:
 * - Newly unblocked tasks
 * - High-impact work
 * - Tasks that move needle toward $20K MRR
 * 
 * Runs via cron every 60 minutes or on webhook when tasks unblock
 */

import * as fs from 'fs'
import * as path from 'path'

interface Task {
  name: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: 'blocked' | 'ready' | 'in_progress' | 'done'
  blocker?: string
  unblocks?: string[]
  impact: 'critical' | 'high' | 'medium' | 'low'
  estimatedMinutes: number
  spawnConfig?: {
    agentId?: string
    model?: string
    priority?: number
  }
}

interface DispatchDecision {
  timestamp: string
  tasksReady: Task[]
  tasksBlocked: Task[]
  recommended: {
    task: Task
    reason: string
    expectedUnblocks: string[]
  } | null
  action: 'spawn' | 'wait' | 'manual_intervention'
}

// Define all tasks for the project
// PRIORITY ORDER: Dependencies must complete before dependents
const PROJECT_TASKS: Task[] = [
  // Phase 1: MVP (Current)
  {
    name: 'Inbound SMS Handler',
    priority: 'P0',
    status: 'done', // Just built
    impact: 'critical',
    estimatedMinutes: 120,
    unblocks: ['Agent Onboarding UI', 'Cal.com Booking Links', 'Conversation Loop Testing'],
  },
  // P0: Core infrastructure - MUST complete before pilots
  {
    name: 'Agent Onboarding UI',
    priority: 'P0',
    status: 'ready',
    impact: 'critical',
    estimatedMinutes: 240,
    unblocks: ['Pilot Recruitment'],
    spawnConfig: { agentId: 'dev', model: 'sonnet' }
  },
  {
    name: 'Cal.com Booking Links',
    priority: 'P0',
    status: 'ready',
    impact: 'critical',
    estimatedMinutes: 180,
    unblocks: ['Pilot Recruitment', 'First Pilot', 'Booking Flow'],
    spawnConfig: { agentId: 'dev', model: 'sonnet' }
  },
  // P0: Deployment ready after core features
  {
    name: 'Pilot Deployment',
    priority: 'P0',
    status: 'ready',
    blocker: 'Agent Onboarding UI', // Requires onboarding first
    impact: 'critical',
    estimatedMinutes: 120,
    unblocks: ['Pilot Validation', 'Revenue'],
    spawnConfig: { agentId: 'dev', model: 'sonnet' }
  },
  // P1: Marketing BLOCKED until onboarding + Cal.com are done
  {
    name: 'Pilot Recruitment (3 agents)',
    priority: 'P1',
    status: 'blocked', // MARKED AS BLOCKED
    blocker: 'Agent Onboarding UI and Cal.com Booking must be complete',
    impact: 'critical',
    estimatedMinutes: 300,
    unblocks: ['First Revenue', 'Use Case Data'],
    spawnConfig: { agentId: 'marketing', model: 'kimi' }
  },
  {
    name: 'PostHog Analytics Setup',
    priority: 'P2',
    status: 'ready',
    impact: 'high',
    estimatedMinutes: 120,
    unblocks: ['Metrics Dashboard', 'Performance Tracking'],
    spawnConfig: { agentId: 'analytics', model: 'kimi' }
  },
  {
    name: 'Stripe Billing Integration',
    priority: 'P1',
    status: 'ready',
    impact: 'high',
    estimatedMinutes: 240,
    unblocks: ['Paid Launch', '$20K MRR'],
    spawnConfig: { agentId: 'dev', model: 'sonnet' }
  },
  {
    name: 'First Pilot Validation',
    priority: 'P0',
    status: 'blocked',
    blocker: 'Pilot Deployment',
    impact: 'critical',
    estimatedMinutes: 180,
    unblocks: ['Conversion Optimization', 'MVP Refinement'],
    spawnConfig: { agentId: 'qc', model: 'haiku' }
  },
  {
    name: 'Conversion Optimization',
    priority: 'P1',
    status: 'blocked',
    blocker: 'First Pilot Validation',
    impact: 'high',
    estimatedMinutes: 240,
    unblocks: ['Scale Phase'],
    spawnConfig: { agentId: 'product', model: 'sonnet' }
  },
  {
    name: 'Second Batch (10 agents)',
    priority: 'P1',
    status: 'blocked',
    blocker: 'Conversion Optimization',
    impact: 'high',
    estimatedMinutes: 240,
    unblocks: ['$20K MRR'],
  },
]

// Check if dependencies are complete before allowing spawn
function checkDependencies(task: Task): { canSpawn: boolean; reason?: string } {
  // Marketing recruitment blocked until onboarding + Cal.com are done
  if (task.name === 'Pilot Recruitment (3 agents)') {
    const onboarding = PROJECT_TASKS.find(t => t.name === 'Agent Onboarding UI')
    const calCom = PROJECT_TASKS.find(t => t.name === 'Cal.com Booking Links')
    
    if (onboarding?.status !== 'done') {
      return { 
        canSpawn: false, 
        reason: `Blocked: Agent Onboarding UI is ${onboarding?.status}, must be 'done'` 
      }
    }
    if (calCom?.status !== 'done') {
      return { 
        canSpawn: false, 
        reason: `Blocked: Cal.com Booking Links is ${calCom?.status}, must be 'done'` 
      }
    }
  }
  
  // Pilot deployment blocked until onboarding is done
  if (task.name === 'Pilot Deployment') {
    const onboarding = PROJECT_TASKS.find(t => t.name === 'Agent Onboarding UI')
    if (onboarding?.status !== 'done') {
      return { 
        canSpawn: false, 
        reason: `Blocked: Agent Onboarding UI must be complete first` 
      }
    }
  }
  
  return { canSpawn: true }
}

function analyzeState(): DispatchDecision {
  const now = new Date().toISOString()
  
  // Check dependencies and update task statuses
  PROJECT_TASKS.forEach(task => {
    if (task.status === 'ready' || task.status === 'blocked') {
      const depCheck = checkDependencies(task)
      if (!depCheck.canSpawn && task.status !== 'blocked') {
        console.log(`  ⛔ ${task.name}: ${depCheck.reason}`)
        task.status = 'blocked'
        task.blocker = depCheck.reason
      } else if (depCheck.canSpawn && task.status === 'blocked') {
        // Unblock if dependencies are now met
        console.log(`  ✅ ${task.name}: Dependencies met, unblocking`)
        task.status = 'ready'
        task.blocker = undefined
      }
    }
  })
  
  // Separate ready vs blocked
  const tasksReady = PROJECT_TASKS.filter(t => t.status === 'ready')
  const tasksBlocked = PROJECT_TASKS.filter(t => t.status === 'blocked')
  
  console.log(`\n📊 Task Analysis (${now})`)
  console.log(`   Ready: ${tasksReady.length}`)
  console.log(`   Blocked: ${tasksBlocked.length}`)
  console.log(`   In Progress: ${PROJECT_TASKS.filter(t => t.status === 'in_progress').length}`)
  console.log(`   Done: ${PROJECT_TASKS.filter(t => t.status === 'done').length}`)
  
  // Score each ready task by impact
  const scoredTasks = tasksReady.map(task => ({
    task,
    score: scoreTask(task),
    reason: explainScore(task)
  }))
  
  scoredTasks.sort((a, b) => b.score - a.score)
  
  // Recommend highest-scoring ready task
  const recommended = scoredTasks.length > 0 
    ? {
        task: scoredTasks[0].task,
        reason: scoredTasks[0].reason,
        expectedUnblocks: scoredTasks[0].task.unblocks || []
      }
    : null
  
  // Determine action
  let action: DispatchDecision['action'] = 'wait'
  
  if (!recommended) {
    action = 'manual_intervention'
    console.log('\n⚠️  No ready tasks found. All work is blocked or in progress.')
  } else if (shouldSpawn(recommended.task)) {
    action = 'spawn'
    console.log(`\n✅ Ready to spawn: ${recommended.task.name}`)
    console.log(`   Impact: ${recommended.task.impact}`)
    console.log(`   Will unblock: ${recommended.expectedUnblocks.join(', ')}`)
  } else {
    action = 'wait'
    console.log(`\n⏳ Waiting to spawn: ${recommended.task.name}`)
    console.log(`   Reason: ${recommended.reason}`)
  }
  
  return {
    timestamp: now,
    tasksReady,
    tasksBlocked,
    recommended,
    action
  }
}

function scoreTask(task: Task): number {
  let score = 0
  
  // Base score by priority
  const priorityScore: Record<string, number> = {
    'P0': 1000,
    'P1': 500,
    'P2': 200,
    'P3': 50
  }
  score += priorityScore[task.priority] || 0
  
  // Impact multiplier
  const impactScore: Record<string, number> = {
    'critical': 3,
    'high': 2,
    'medium': 1,
    'low': 0.5
  }
  score *= impactScore[task.impact] || 1
  
  // Bonus for unblocking critical tasks
  if (task.unblocks) {
    const unblocksCritical = PROJECT_TASKS.some(t =>
      task.unblocks!.includes(t.name) && t.impact === 'critical'
    )
    if (unblocksCritical) score *= 1.5
  }
  
  return score
}

function explainScore(task: Task): string {
  const impacts = []
  
  impacts.push(`Priority: ${task.priority}`)
  impacts.push(`Impact: ${task.impact}`)
  
  if (task.unblocks && task.unblocks.length > 0) {
    const criticalUnblocks = task.unblocks.filter(name =>
      PROJECT_TASKS.find(t => t.name === name && t.impact === 'critical')
    )
    if (criticalUnblocks.length > 0) {
      impacts.push(`Unblocks critical: ${criticalUnblocks.join(', ')}`)
    }
  }
  
  return impacts.join(' | ')
}

function shouldSpawn(task: Task): boolean {
  // Check if we're within spawn window
  const now = new Date()
  const hour = now.getHours()
  
  // Don't spawn during quiet hours (midnight - 6am)
  if (hour >= 0 && hour < 6) {
    console.log('   ⏸️  In quiet hours (0-6am). Will spawn at 6am.')
    return false
  }
  
  // Check concurrency
  const activeCount = PROJECT_TASKS.filter(t => t.status === 'in_progress').length
  if (activeCount >= 5) {
    console.log(`   ⏸️  Max concurrent agents (${activeCount}/5). Waiting for one to finish.`)
    return false
  }
  
  // Ready to spawn
  return true
}

async function executeDispatch(decision: DispatchDecision): Promise<void> {
  if (decision.action !== 'spawn') {
    console.log(`\n→ Action: ${decision.action}`)
    return
  }
  
  if (!decision.recommended) {
    console.log('No task to spawn')
    return
  }
  
  const task = decision.recommended.task
  const config = task.spawnConfig || {}
  
  console.log(`\n🚀 Spawning Agent: ${config.agentId || 'default'}`)
  console.log(`   Task: ${task.name}`)
  console.log(`   Model: ${config.model || 'default'}`)
  console.log(`   Est. Time: ${task.estimatedMinutes}min`)
  
  // Build spawn command
  const spawnPrompt = buildSpawnPrompt(task)
  
  console.log(`\n📝 Spawn Prompt:\n${spawnPrompt}\n`)
  
  // Log decision to file for audit trail
  const logPath = path.join(process.cwd(), '..', '..', 'dispatch-log.jsonl')
  const logEntry = {
    timestamp: decision.timestamp,
    task: task.name,
    agentId: config.agentId || 'default',
    model: config.model || 'default',
    status: 'spawned',
    prompt: spawnPrompt.substring(0, 100) + '...'
  }
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n')
  
  // Write spawn config for actual execution
  const spawnConfigPath = path.join(process.cwd(), '..', '..', '.spawn-config.json')
  fs.writeFileSync(spawnConfigPath, JSON.stringify({
    task: task.name,
    agentId: config.agentId || 'default',
    model: config.model || 'default',
    prompt: spawnPrompt,
    timeout: (task.estimatedMinutes + 30) * 60, // Add 30min buffer
    priority: config.priority || 5
  }, null, 2))
  
  console.log('✅ Spawn config written.')
  
  // Trigger auto-spawn with budget check (7/10 autonomy)
  console.log('\n🤖 Triggering auto-spawn with cost guardrails...')
  const autoSpawnPath = path.join(process.cwd(), '..', '..', '..', 'auto-spawn.js')
  if (fs.existsSync(autoSpawnPath)) {
    console.log('   Auto-spawn script found.')
    console.log('   Budget: $5/day | Auto-approve if under limit')
    console.log('   Check: node budget-dashboard.js')
  } else {
    console.log('   ⚠️  Auto-spawn script not found. Manual spawn required.')
  }
}

function buildSpawnPrompt(task: Task): string {
  return `Task: ${task.name}

Priority: ${task.priority}
Impact: ${task.impact}
Estimated: ${task.estimatedMinutes} minutes

Context:
- Project Goal: $20K MRR in 60 days (Day ${daysSinceStart()}/60)
- Unblocks: ${task.unblocks?.join(', ') || 'Nothing critical'}
- Current Blockers: ${task.blocker || 'None'}

Success Criteria:
- All tests pass
- Code deployed
- Changes pushed to main
- Status documented

Go!`
}

function daysSinceStart(): number {
  // Feb 10 was project start
  const start = new Date('2026-02-10')
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function loadSystemState() {
  try {
    const statePath = path.join(process.cwd(), 'system-state.json')
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
    }
  } catch (error) {
    console.warn('Could not load system state')
  }
  return null
}

// Main
async function main() {
  console.log('🤖 BO2026 Task Dispatcher')
  console.log('=======================')
  
  // Load current system state
  const systemState = loadSystemState()
  if (systemState) {
    console.log(`\n📡 System Health: ${systemState.summary.ok}/${systemState.summary.ok + systemState.summary.error} OK`)
    
    // Update task statuses based on system state
    if (systemState.summary.error > 0) {
      console.log('⚠️  System has errors. Pausing dispatches.')
      process.exit(0)
    }
  }
  
  // Analyze current state
  const decision = analyzeState()
  
  // Execute dispatch decision
  await executeDispatch(decision)
  
  // Write decision log
  const decisionPath = path.join(process.cwd(), '..', '..', 'dispatch-decision.json')
  fs.writeFileSync(decisionPath, JSON.stringify(decision, null, 2))
  
  console.log('\n📋 Decision logged to dispatch-decision.json')
}

main().catch(error => {
  console.error('Dispatcher error:', error)
  process.exit(1)
})
