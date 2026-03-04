const fs = require('fs')
const path = require('path')

// Configuration
const DAILY_BUDGET = 5.00
const BUDGET_FILE = path.join(process.cwd(), 'budget-tracker.json')
const SPAWN_CONFIG = path.join(process.cwd(), '.spawn-config.json')
const SPAWN_LOG = path.join(process.cwd(), 'spawn-log.jsonl')

// Cost estimates per model per hour (USD)
const MODEL_COSTS = {
  'qwen': 0.00,
  'kimi': 0.30,
  'haiku': 0.50,
  'sonnet': 2.00,
  'opus': 8.00,
  'default': 1.00
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function loadBudget() {
  try {
    if (fs.existsSync(BUDGET_FILE)) {
      const state = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8'))
      if (state.date !== getToday()) {
        return { date: getToday(), spent: 0, spawns: [] }
      }
      return state
    }
  } catch (e) {
    console.warn('Could not load budget, starting fresh')
  }
  return { date: getToday(), spent: 0, spawns: [] }
}

function saveBudget(state) {
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(state, null, 2))
}

function estimateCost(config) {
  const modelKey = Object.keys(MODEL_COSTS).find(k => 
    config.model.toLowerCase().includes(k)
  ) || 'default'
  
  const hourlyRate = MODEL_COSTS[modelKey]
  const hours = config.timeout / 3600
  
  return hourlyRate * hours
}

function canAutoSpawn(cost, budget) {
  const remaining = DAILY_BUDGET - budget.spent
  
  if (cost > DAILY_BUDGET) {
    return {
      allowed: false,
      reason: `Cost $${cost.toFixed(2)} exceeds daily budget $${DAILY_BUDGET}`,
      remaining
    }
  }
  
  if (budget.spent + cost > DAILY_BUDGET) {
    return {
      allowed: false,
      reason: `Would exceed daily budget. Spent: $${budget.spent.toFixed(2)}, Cost: $${cost.toFixed(2)}`,
      remaining
    }
  }
  
  return {
    allowed: true,
    reason: `Within budget. Remaining: $${(remaining - cost).toFixed(2)}`,
    remaining
  }
}

function logSpawn(config, cost, status) {
  const entry = {
    timestamp: new Date().toISOString(),
    task: config.task,
    agentId: config.agentId,
    model: config.model,
    estimatedCost: cost,
    status,
    budgetAfter: loadBudget().spent + (status === 'auto' ? cost : 0)
  }
  fs.appendFileSync(SPAWN_LOG, JSON.stringify(entry) + '\n')
}

async function executeSpawn(config) {
  try {
    const sessionKey = `bo2026-${config.agentId}-${Date.now()}`
    
    console.log(`\n🚀 Executing spawn...`)
    console.log(`   Session: ${sessionKey}`)
    console.log(`   Model: ${config.model}`)
    console.log(`   Timeout: ${config.timeout}s`)
    
    config.spawned = true
    config.spawnTime = new Date().toISOString()
    fs.writeFileSync(SPAWN_CONFIG, JSON.stringify(config, null, 2))
    
    console.log(`   ✅ Spawn marked complete`)
    
    // 8/10: Auto-trigger self-test after spawn
    console.log(`\n🧪 Auto-triggering self-test v2 (8/10)...`)
    const { execSync } = require('child_process')
    
    try {
      // Run self-test v2 with acceptance criteria verification
      execSync(`node self-test-v2.js --task-id ${config.task}`, { 
        stdio: 'inherit',
        timeout: 300000 // 5 min timeout
      })
      console.log(`   ✅ Self-test passed`)
      
      // Clear any recovery state on success
      try {
        execSync('node failure-recovery.js success', { stdio: 'ignore' })
      } catch (e) {
        // Ignore
      }
      
    } catch (testError) {
      console.log(`   ❌ Self-test failed`)
      console.log(`\n🔄 Entering failure recovery...`)
      
      // Trigger recovery
      try {
        execSync('node failure-recovery.js fail "Self-test failed"', { 
          stdio: 'inherit' 
        })
        console.log(`   ✅ Recovery prepared. Will retry on next cycle.`)
      } catch (recoveryError) {
        console.error(`   ❌ Recovery failed:`, recoveryError.message)
      }
      
      // Return true because spawn succeeded, even if test failed
      // Recovery will handle the retry
    }
    
    return true
    
  } catch (error) {
    console.error(`   ❌ Spawn failed:`, error.message)
    return false
  }
}

async function escalateToHuman(config, cost, reason) {
  console.log(`\nESCALATING TO HUMAN`)
  console.log(`   Task: ${config.task}`)
  console.log(`   Cost: $${cost.toFixed(2)}`)
  console.log(`   Reason: ${reason}`)
  
  const escalationPath = path.join(process.cwd(), 'escalation-pending.json')
  const escalation = {
    timestamp: new Date().toISOString(),
    type: 'budget_exceeded',
    config,
    estimatedCost: cost,
    reason,
    action: 'review_and_approve',
    approveCommand: `cd ${process.cwd()} && node auto-spawn.js --force`
  }
  
  fs.writeFileSync(escalationPath, JSON.stringify(escalation, null, 2))
  
  logSpawn(config, cost, 'escalated')
  
  console.log(`   Escalation written to: ${escalationPath}`)
  console.log(`   To approve manually: ${escalation.approveCommand}`)
}

async function main() {
  console.log('Auto-Spawn with Cost Guardrails')
  console.log('====================================')
  console.log(`   Daily Budget: $${DAILY_BUDGET}`)
  console.log(`   Date: ${getToday()}`)
  
  const budget = loadBudget()
  console.log(`   Spent Today: $${budget.spent.toFixed(2)}`)
  console.log(`   Remaining: $${(DAILY_BUDGET - budget.spent).toFixed(2)}`)
  
  if (!fs.existsSync(SPAWN_CONFIG)) {
    console.log('\nNo spawn config found. Nothing to do.')
    process.exit(0)
  }
  
  const config = JSON.parse(fs.readFileSync(SPAWN_CONFIG, 'utf-8'))
  
  if (config.spawned) {
    console.log(`\nAlready spawned: ${config.task} at ${config.spawnTime}`)
    console.log('   Nothing to do.')
    process.exit(0)
  }
  
  console.log(`\nSpawn Config Found:`)
  console.log(`   Task: ${config.task}`)
  console.log(`   Agent: ${config.agentId}`)
  console.log(`   Model: ${config.model}`)
  
  const estimatedCost = estimateCost(config)
  console.log(`\nCost Estimate:`)
  console.log(`   Model Rate: ~$${MODEL_COSTS[config.model.toLowerCase()] || MODEL_COSTS.default}/hr`)
  console.log(`   Duration: ${(config.timeout / 3600).toFixed(2)} hrs`)
  console.log(`   Estimated Cost: $${estimatedCost.toFixed(2)}`)
  
  const budgetCheck = canAutoSpawn(estimatedCost, budget)
  console.log(`\nBudget Check:`)
  console.log(`   ${budgetCheck.allowed ? 'PASS' : 'FAIL'} - ${budgetCheck.reason}`)
  
  if (budgetCheck.allowed) {
    const success = await executeSpawn(config)
    
    if (success) {
      budget.spent += estimatedCost
      budget.spawns.push({
        task: config.task,
        agentId: config.agentId,
        model: config.model,
        estimatedCost,
        time: new Date().toISOString()
      })
      saveBudget(budget)
      
      logSpawn(config, estimatedCost, 'auto')
      
      console.log(`\nAUTO-SPAWN COMPLETE`)
      console.log(`   Task: ${config.task}`)
      console.log(`   Cost: $${estimatedCost.toFixed(2)}`)
      console.log(`   Budget Remaining: $${(DAILY_BUDGET - budget.spent).toFixed(2)}`)
    } else {
      logSpawn(config, estimatedCost, 'failed')
      console.log(`\nSpawn failed. Check logs.`)
      process.exit(1)
    }
  } else {
    await escalateToHuman(config, estimatedCost, budgetCheck.reason)
    console.log(`\nAWAITING HUMAN APPROVAL`)
  }
}

main().catch(error => {
  console.error('Auto-spawn error:', error)
  process.exit(1)
})
