#!/usr/bin/env node
/**
 * Migrate from hardcoded tasks to database (Phase 2)
 * 
 * Run: node migrate-to-db.js
 */

const { TaskStore } = require('./task-store')
const fs = require('fs')

// Hardcoded tasks from task-dispatcher.ts
const HARDCODED_TASKS = [
  {
    name: 'Inbound SMS Handler',
    priority: 'P0',
    status: 'done',
    impact: 'critical',
    estimatedMinutes: 120,
    unblocks: ['Agent Onboarding UI', 'Cal.com Booking Links'],
    spawnConfig: { agentId: 'dev', model: 'sonnet' }
  },
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
  {
    name: 'Pilot Deployment',
    priority: 'P0',
    status: 'ready',
    impact: 'critical',
    estimatedMinutes: 120,
    unblocks: ['Pilot Validation', 'Revenue'],
    blocker: 'Agent Onboarding UI',
    spawnConfig: { agentId: 'dev', model: 'sonnet' }
  },
  {
    name: 'Pilot Recruitment (3 agents)',
    priority: 'P1',
    status: 'blocked',
    impact: 'critical',
    estimatedMinutes: 300,
    unblocks: ['First Revenue', 'Use Case Data'],
    blocker: 'Agent Onboarding UI and Cal.com Booking',
    spawnConfig: { agentId: 'marketing', model: 'kimi' }
  },
  {
    name: 'PostHog Analytics Setup',
    priority: 'P2',
    status: 'ready',
    impact: 'high',
    estimatedMinutes: 120,
    unblocks: ['Metrics Dashboard'],
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
    impact: 'critical',
    estimatedMinutes: 180,
    unblocks: ['Conversion Optimization'],
    blocker: 'Pilot Deployment',
    spawnConfig: { agentId: 'qc', model: 'haiku' }
  },
  {
    name: 'Conversion Optimization',
    priority: 'P1',
    status: 'blocked',
    impact: 'high',
    estimatedMinutes: 240,
    unblocks: ['Scale Phase'],
    blocker: 'First Pilot Validation',
    spawnConfig: { agentId: 'product', model: 'sonnet' }
  }
]

async function migrate() {
  console.log('🔄 Phase 2 Migration: Hardcoded → Database')
  console.log('==========================================\n')
  
  const store = new TaskStore()
  const createdIds = {}
  
  // Step 1: Create all tasks
  console.log('Step 1: Creating tasks...')
  
  for (const task of HARDCODED_TASKS) {
    const priorityMap = { 'P0': 1, 'P1': 2, 'P2': 3, 'P3': 4 }
    
    const created = await store.createTask({
      title: task.name,
      description: `Impact: ${task.impact}. Unblocks: ${task.unblocks?.join(', ') || 'none'}`,
      agentId: task.spawnConfig?.agentId,
      model: task.spawnConfig?.model,
      priority: priorityMap[task.priority] || 3,
      status: task.status === 'done' ? 'done' : 
              task.status === 'ready' ? 'ready' : 
              task.status === 'blocked' ? 'blocked' : 'backlog',
      estimatedHours: task.estimatedMinutes / 60,
      estimatedCost: (task.estimatedMinutes / 60) * (task.spawnConfig?.model === 'sonnet' ? 2 : 0.3),
      acceptanceCriteria: [
        `Complete ${task.name}`,
        'All tests pass',
        'Update task status',
        ...(task.unblocks || []).map(u => `Unblocks: ${u}`)
      ],
      tags: [task.priority, task.impact, ...(task.unblocks || [])]
    })
    
    createdIds[task.name] = created.id
    console.log(`  ✅ ${task.name} (${created.id})`)
  }
  
  // Step 2: Create dependencies
  console.log('\nStep 2: Creating dependencies...')
  
  for (const task of HARDCODED_TASKS) {
    if (task.blocker) {
      // Find blocker task
      const blockerTask = HARDCODED_TASKS.find(t => 
        task.blocker.includes(t.name)
      )
      
      if (blockerTask && createdIds[blockerTask.name] && createdIds[task.name]) {
        await store.addDependency(
          createdIds[task.name],
          createdIds[blockerTask.name],
          'hard'
        )
        console.log(`  🔗 ${task.name} → depends on → ${blockerTask.name}`)
      }
    }
  }
  
  // Step 3: Check for unblocked tasks
  console.log('\nStep 3: Checking for unblocked tasks...')
  
  for (const task of HARDCODED_TASKS) {
    if (task.status === 'done' && createdIds[task.name]) {
      await store.checkUnblockedTasks(createdIds[task.name])
    }
  }
  
  // Step 4: Verify
  console.log('\nStep 4: Verification...')
  
  const allTasks = await store.getTasks()
  const byStatus = {
    backlog: allTasks.filter(t => t.status === 'backlog').length,
    ready: allTasks.filter(t => t.status === 'ready').length,
    blocked: allTasks.filter(t => t.status === 'blocked').length,
    done: allTasks.filter(t => t.status === 'done').length
  }
  
  console.log(`  Total tasks: ${allTasks.length}`)
  console.log(`  Ready: ${byStatus.ready}`)
  console.log(`  Blocked: ${byStatus.blocked}`)
  console.log(`  Done: ${byStatus.done}`)
  
  // Save mapping for reference
  fs.writeFileSync('.task-id-mapping.json', JSON.stringify(createdIds, null, 2))
  
  console.log('\n✅ Migration complete!')
  console.log('📄 Task ID mapping saved to .task-id-mapping.json')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Update dispatcher-v2.js with project_id')
  console.log('  2. Run: node dispatcher-v2.js stats')
  console.log('  3. Run: node dispatcher-v2.js watch')
}

migrate().catch(error => {
  console.error('Migration failed:', error)
  process.exit(1)
})
