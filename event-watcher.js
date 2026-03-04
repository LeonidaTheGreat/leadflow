#!/usr/bin/env node
/**
 * Event Watcher - Real-time Event-Driven Autonomy (8/10)
 * 
 * Watches for file changes and triggers immediate response
 * - spawn-config changes → run pipeline
 * - test-results changes → check for unblocking
 * - escalation-resolved → resume work
 * 
 * Run: node event-watcher.js
 * Or: node event-watcher.js & (background)
 */

const fs = require('fs')
const path = require('path')
const { spawn, execSync } = require('child_process')

// Files to watch
const WATCHED_FILES = [
  '.spawn-config.json',      // New spawn request
  'test-results.json',       // Test completed
  'escalation-resolved.json', // Human resolved escalation
  'budget-tracker.json'      // Budget updated
]

// Debounce to avoid multiple triggers
const DEBOUNCE_MS = 1000
const debouncers = new Map()

function logEvent(message) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`)
  
  // Also log to file
  const logPath = path.join(process.cwd(), 'event-watcher.log')
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`)
}

function debounce(key, fn, ms = DEBOUNCE_MS) {
  if (debouncers.has(key)) {
    clearTimeout(debouncers.get(key))
  }
  
  const timeout = setTimeout(() => {
    debouncers.delete(key)
    fn()
  }, ms)
  
  debouncers.set(key, timeout)
}

function handleSpawnConfigChange() {
  logEvent('📋 .spawn-config.json changed → Triggering pipeline')
  
  // Run pipeline in background
  const child = spawn('node', ['pipeline-8-10.js'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  
  child.stdout.on('data', (data) => {
    logEvent(`[Pipeline] ${data.toString().trim()}`)
  })
  
  child.stderr.on('data', (data) => {
    logEvent(`[Pipeline Error] ${data.toString().trim()}`)
  })
  
  child.on('close', (code) => {
    logEvent(`[Pipeline] Exited with code ${code}`)
  })
  
  child.unref()
}

function handleTestResultsChange() {
  logEvent('🧪 test-results.json changed → Checking for unblocking')
  
  try {
    const results = JSON.parse(fs.readFileSync('test-results.json', 'utf-8'))
    
    if (results.passed) {
      logEvent('✅ Tests passed → Checking for unblocked tasks')
      
      // Update task state if we have task store
      // For now, just log
      logEvent(`   Task: ${results.taskId || 'unknown'}`)
      logEvent(`   Agent: ${results.agentId}`)
      logEvent(`   Tests: ${results.testsPassed}/${results.testsRun}`)
      
      // Signal that work is complete
      // This could trigger dependent tasks
      signalTaskComplete(results)
      
    } else {
      logEvent('❌ Tests failed → Recovery will handle retry')
    }
    
  } catch (error) {
    logEvent(`⚠️  Could not parse test results: ${error.message}`)
  }
}

function signalTaskComplete(results) {
  // Write completion signal
  const signalPath = path.join(process.cwd(), '.task-complete.json')
  fs.writeFileSync(signalPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    taskId: results.taskId,
    agentId: results.agentId,
    success: true,
    testsPassed: results.testsPassed,
    testsRun: results.testsRun
  }, null, 2))
  
  logEvent('📝 Task completion signal written to .task-complete.json')
}

function handleEscalationResolved() {
  logEvent('✅ escalation-resolved.json detected → Human approved, resuming')
  
  // Read the resolution
  try {
    const resolution = JSON.parse(fs.readFileSync('escalation-resolved.json', 'utf-8'))
    logEvent(`   Resolution: ${resolution.action}`)
    
    if (resolution.action === 'retry') {
      // Trigger pipeline to retry
      setTimeout(() => {
        spawn('node', ['pipeline-8-10.js'], { detached: true, stdio: 'ignore' })
      }, 1000)
    }
    
    // Clean up resolution file
    fs.unlinkSync('escalation-resolved.json')
    
  } catch (error) {
    logEvent(`⚠️  Could not parse escalation resolution: ${error.message}`)
  }
}

function handleBudgetChange() {
  logEvent('💰 Budget updated → Checking if new spawns possible')
  
  try {
    const budget = JSON.parse(fs.readFileSync('budget-tracker.json', 'utf-8'))
    const remaining = 5.00 - budget.spent
    
    logEvent(`   Spent: $${budget.spent.toFixed(2)}`)
    logEvent(`   Remaining: $${remaining.toFixed(2)}`)
    
    // If we now have budget, check for pending spawns
    if (remaining > 0.5) { // At least $0.50 for a cheap task
      checkForPendingSpawns()
    }
    
  } catch (error) {
    logEvent(`⚠️  Could not parse budget: ${error.message}`)
  }
}

function checkForPendingSpawns() {
  // Check if there's a spawn config waiting
  if (fs.existsSync('.spawn-config.json')) {
    try {
      const config = JSON.parse(fs.readFileSync('.spawn-config.json', 'utf-8'))
      
      if (!config.spawned) {
        logEvent('📋 Found unspawned config with budget available → Triggering')
        spawn('node', ['pipeline-8-10.js'], { detached: true, stdio: 'ignore' })
      }
      
    } catch (error) {
      // Ignore
    }
  }
}

// Watch files using fs.watchFile (more reliable than fs.watch for some systems)
function startWatching() {
  logEvent('👁️  Event Watcher Starting (8/10 Autonomy)')
  logEvent('=====================================')
  logEvent('Watching for:')
  WATCHED_FILES.forEach(f => logEvent(`  • ${f}`))
  logEvent('')
  
  WATCHED_FILES.forEach(filename => {
    const filepath = path.join(process.cwd(), filename)
    
    // Create file if doesn't exist (so we can watch it)
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, '{}')
    }
    
    // Watch for changes
    fs.watchFile(filepath, { interval: 1000 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        logEvent(`🔔 ${filename} modified`)
        
        debounce(filename, () => {
          switch(filename) {
            case '.spawn-config.json':
              handleSpawnConfigChange()
              break
            case 'test-results.json':
              handleTestResultsChange()
              break
            case 'escalation-resolved.json':
              handleEscalationResolved()
              break
            case 'budget-tracker.json':
              handleBudgetChange()
              break
          }
        })
      }
    })
    
    logEvent(`✅ Watching: ${filename}`)
  })
  
  logEvent('')
  logEvent('Event watcher is running...')
  logEvent('Press Ctrl+C to stop')
  logEvent('')
}

// Handle process signals
process.on('SIGINT', () => {
  logEvent('\n👋 Event watcher stopping...')
  
  // Stop watching
  WATCHED_FILES.forEach(filename => {
    const filepath = path.join(process.cwd(), filename)
    fs.unwatchFile(filepath)
  })
  
  process.exit(0)
})

process.on('SIGTERM', () => {
  logEvent('\n👋 Event watcher stopping (SIGTERM)...')
  process.exit(0)
})

// Start watching
startWatching()

// Keep process alive
setInterval(() => {
  // Heartbeat - log every 5 minutes that we're alive
}, 300000)

logEvent('💓 Event watcher heartbeat active (5min intervals)')
