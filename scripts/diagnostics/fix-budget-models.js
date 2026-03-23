#!/usr/bin/env node
/**
 * Downgrade tasks to cheaper models (Kimi) to fit budget
 * 
 * Run: node fix-budget-models.js
 */

const { TaskStore } = require('./task-store')

// Model costs
const MODEL_COSTS = {
  'qwen': 0.00,
  'kimi': 0.30,
  'haiku': 0.50,
  'sonnet': 2.00,
  'opus': 8.00
}

async function fixBudgetModels() {
  console.log('💰 Budget Model Fix')
  console.log('===================\n')
  
  const store = new TaskStore()
  
  // Get all tasks that are ready or blocked
  const allTasks = await store.getTasks()
  const readyOrBlocked = allTasks.filter(t => 
    t.status === 'ready' || t.status === 'blocked' || t.status === 'backlog'
  )
  
  console.log(`Found ${readyOrBlocked.length} tasks to review\n`)
  
  let totalOldCost = 0
  let totalNewCost = 0
  let updatedCount = 0
  
  for (const task of readyOrBlocked) {
    const oldModel = task.model || 'kimi'
    const hours = task.estimated_hours || 1
    const oldCost = MODEL_COSTS[oldModel] * hours
    
    // Skip if already cheap
    if (oldCost <= 1.00) {
      console.log(`✅ ${task.title}: Already cheap ($${oldCost.toFixed(2)})`)
      totalOldCost += oldCost
      totalNewCost += oldCost
      continue
    }
    
    // Downgrade to Kimi
    const newModel = 'kimi'
    const newCost = MODEL_COSTS[newModel] * hours
    
    console.log(`🔽 ${task.title}`)
    console.log(`   ${oldModel} ($${oldCost.toFixed(2)}) → ${newModel} ($${newCost.toFixed(2)})`)
    
    // Update task
    await store.updateTask(task.id, { 
      model: newModel,
      estimated_cost_usd: newCost
    })
    
    totalOldCost += oldCost
    totalNewCost += newCost
    updatedCount++
  }
  
  console.log('\n' + '='.repeat(40))
  console.log('Summary:')
  console.log(`  Tasks updated: ${updatedCount}`)
  console.log(`  Old total cost: $${totalOldCost.toFixed(2)}`)
  console.log(`  New total cost: $${totalNewCost.toFixed(2)}`)
  console.log(`  Savings: $${(totalOldCost - totalNewCost).toFixed(2)}`)
  console.log(`  Budget: $5.00/day`)
  
  if (totalNewCost <= 5.00) {
    console.log(`  ✅ All tasks fit in budget!`)
  } else {
    console.log(`  ⚠️  Still exceeds budget. Need to increase to $${Math.ceil(totalNewCost)}`)
  }
  
  console.log('\nNext: Restart dispatcher to pick up changes')
  console.log('  ./start-dispatcher.sh --restart')
}

fixBudgetModels().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
