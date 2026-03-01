const fs = require('fs')
const path = require('path')

const BUDGET_FILE = path.join(process.cwd(), 'budget-tracker.json')
const SPAWN_LOG = path.join(process.cwd(), 'spawn-log.jsonl')
const DAILY_BUDGET = 5.00

function loadBudget() {
  try {
    if (fs.existsSync(BUDGET_FILE)) {
      return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8'))
    }
  } catch (e) {}
  return null
}

function loadSpawnHistory() {
  try {
    if (fs.existsSync(SPAWN_LOG)) {
      return fs.readFileSync(SPAWN_LOG, 'utf-8')
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
    }
  } catch (e) {}
  return []
}

function getProgressBar(percent, width = 20) {
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `[${bar}] ${percent.toFixed(0)}%`
}

function getStatusColor(percent) {
  if (percent < 50) return 'OK'
  if (percent < 80) return 'WARN'
  return 'ALERT'
}

function main() {
  const budget = loadBudget()
  const history = loadSpawnHistory()
  
  console.log('Auto-Spawn Budget Dashboard')
  console.log('===========================\n')
  
  if (!budget) {
    console.log('No budget data yet.')
    console.log(`Daily Budget: $${DAILY_BUDGET.toFixed(2)}`)
    console.log('Spent Today: $0.00')
    console.log('Status: Ready')
    return
  }
  
  const percentUsed = (budget.spent / DAILY_BUDGET) * 100
  const remaining = DAILY_BUDGET - budget.spent
  
  console.log(`Date: ${budget.date}`)
  console.log(`Daily Budget: $${DAILY_BUDGET.toFixed(2)}`)
  console.log(`Spent Today: $${budget.spent.toFixed(2)}`)
  console.log(`Remaining: $${remaining.toFixed(2)}`)
  console.log(`\n[${getStatusColor(percentUsed)}] ${getProgressBar(percentUsed)}`)
  
  if (percentUsed >= 100) {
    console.log('\nBUDGET EXHAUSTED')
    console.log('No auto-spawns until tomorrow.')
    console.log('Manual approval required for additional work.')
  } else if (percentUsed >= 80) {
    console.log('\nBUDGET WARNING')
    console.log('Approaching limit. Large tasks may require approval.')
  } else {
    console.log('\nBUDGET HEALTHY')
    console.log('Auto-spawn active for eligible tasks.')
  }
  
  if (budget.spawns && budget.spawns.length > 0) {
    console.log('\nToday\'s Spawns:')
    budget.spawns.forEach((spawn, i) => {
      const time = new Date(spawn.time).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      console.log(`  ${i + 1}. [${time}] ${spawn.agentId}: ${spawn.task} ($${spawn.estimatedCost.toFixed(2)})`)
    })
  }
  
  if (history.length > (budget.spawns?.length || 0)) {
    console.log('\nRecent History:')
    history.slice(-5).reverse().forEach((entry) => {
      const status = entry.status === 'auto' ? '[AUTO]' : 
                    entry.status === 'escalated' ? '[HUMAN]' : '[FAIL]'
      console.log(`  ${status} ${entry.task} ($${entry.estimatedCost.toFixed(2)})`)
    })
  }
  
  console.log('\n' + '─'.repeat(40))
}

main()
