const fs = require('fs')
const path = require('path')

// Failure Recovery System (8/10 Autonomy)
// Auto-retry failed tasks up to 3 times, then escalate model

const MAX_RETRIES = 3
const RETRY_BACKOFF = [0, 5000, 15000] // ms: immediate, 5s, 15s
const RECOVERY_LOG = path.join(process.cwd(), 'recovery-log.jsonl')
const SPAWN_CONFIG = path.join(process.cwd(), '.spawn-config.json')

// Model escalation path
const MODEL_ESCALATION = {
  'qwen': 'kimi',
  'kimi': 'haiku',
  'haiku': 'sonnet',
  'sonnet': 'opus',
  'opus': 'human' // Can't escalate past Opus
}

// Cost multiplier for retries (discourage expensive retries)
const RETRY_COST_MULTIPLIER = 1.5

function logRecovery(entry) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  }
  fs.appendFileSync(RECOVERY_LOG, JSON.stringify(logEntry) + '\n')
}

function loadSpawnConfig() {
  try {
    if (fs.existsSync(SPAWN_CONFIG)) {
      return JSON.parse(fs.readFileSync(SPAWN_CONFIG, 'utf-8'))
    }
  } catch (e) {}
  return null
}

function loadRecoveryState() {
  const statePath = path.join(process.cwd(), '.recovery-state.json')
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
    }
  } catch (e) {}
  return {
    taskId: null,
    attempt: 0,
    history: [],
    lastError: null
  }
}

function saveRecoveryState(state) {
  const statePath = path.join(process.cwd(), '.recovery-state.json')
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}

function getNextModel(currentModel) {
  const model = currentModel.toLowerCase()
  return MODEL_ESCALATION[model] || 'human'
}

function calculateRetryCost(originalCost, attempt) {
  return originalCost * Math.pow(RETRY_COST_MULTIPLIER, attempt)
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function escalateToHuman(config, reason, recoveryState) {
  console.log('\n📤 ESCALATING TO HUMAN')
  console.log(`   Task: ${config.task}`)
  console.log(`   Reason: ${reason}`)
  console.log(`   Attempts: ${recoveryState.attempt}/${MAX_RETRIES}`)
  
  const escalationPath = path.join(process.cwd(), 'escalation-pending.json')
  const escalation = {
    timestamp: new Date().toISOString(),
    type: 'max_retries_exceeded',
    config,
    recoveryState,
    reason,
    action: 'human_intervention_required',
    options: [
      'Override and retry with same model',
      'Escalate to higher model (increased cost)',
      'Break task into smaller pieces',
      'Abandon task'
    ]
  }
  
  fs.writeFileSync(escalationPath, JSON.stringify(escalation, null, 2))
  
  logRecovery({
    event: 'escalated_to_human',
    task: config.task,
    agentId: config.agentId,
    attempts: recoveryState.attempt,
    reason
  })
  
  console.log(`   Escalation written to: ${escalationPath}`)
  
  // Clear recovery state
  saveRecoveryState({ taskId: null, attempt: 0, history: [], lastError: null })
  
  return escalation
}

async function prepareRetry(config, recoveryState, failureReason) {
  const nextAttempt = recoveryState.attempt + 1
  
  if (nextAttempt > MAX_RETRIES) {
    return escalateToHuman(config, 'Max retries exceeded', {
      ...recoveryState,
      attempt: nextAttempt,
      lastError: failureReason
    })
  }
  
  // Determine next model
  const nextModel = getNextModel(config.model)
  
  if (nextModel === 'human') {
    return escalateToHuman(config, 'Already at max model (Opus)', {
      ...recoveryState,
      attempt: nextAttempt,
      lastError: failureReason
    })
  }
  
  // Calculate new cost
  const originalCost = require('./auto-spawn.js').estimateCost?.(config) || 1.0
  const newCost = calculateRetryCost(originalCost, nextAttempt)
  
  console.log(`\n🔄 RETRY ${nextAttempt}/${MAX_RETRIES}`)
  console.log(`   Previous: ${config.model}`)
  console.log(`   Next: ${nextModel}`)
  console.log(`   Backoff: ${RETRY_BACKOFF[nextAttempt - 1]}ms`)
  console.log(`   Est. Cost: $${newCost.toFixed(2)} (was $${originalCost.toFixed(2)})`)
  
  // Update config
  const newConfig = {
    ...config,
    model: nextModel,
    retryAttempt: nextAttempt,
    previousModel: config.model,
    failureReason,
    prompt: `[RETRY ${nextAttempt}/${MAX_RETRIES}] Previous attempt failed: ${failureReason}\n\n${config.prompt}`
  }
  
  // Save updated config
  fs.writeFileSync(SPAWN_CONFIG, JSON.stringify(newConfig, null, 2))
  
  // Update recovery state
  const newState = {
    taskId: config.task,
    attempt: nextAttempt,
    history: [
      ...recoveryState.history,
      {
        attempt: recoveryState.attempt,
        model: config.model,
        error: failureReason,
        time: new Date().toISOString()
      }
    ],
    lastError: failureReason
  }
  saveRecoveryState(newState)
  
  // Log recovery attempt
  logRecovery({
    event: 'retry_prepared',
    task: config.task,
    attempt: nextAttempt,
    previousModel: config.model,
    nextModel,
    cost: newCost
  })
  
  // Apply backoff
  const backoff = RETRY_BACKOFF[nextAttempt - 1] || 30000
  if (backoff > 0) {
    console.log(`   Waiting ${backoff}ms before retry...`)
    await sleep(backoff)
  }
  
  console.log('   ✅ Retry ready. Auto-spawn will pick this up.')
  return { action: 'retry', config: newConfig }
}

async function handleFailure(failureReason, testResults = null) {
  console.log('Failure Recovery System (8/10 Autonomy)')
  console.log('=======================================')
  
  const config = loadSpawnConfig()
  if (!config) {
    console.log('❌ No spawn config found')
    return { action: 'error', reason: 'no_config' }
  }
  
  console.log(`\nTask: ${config.task}`)
  console.log(`Agent: ${config.agentId}`)
  console.log(`Current Model: ${config.model}`)
  
  const recoveryState = loadRecoveryState()
  
  // Check if this is a new task or continuation
  if (recoveryState.taskId !== config.task) {
    // New task, reset state
    saveRecoveryState({
      taskId: config.task,
      attempt: 0,
      history: [],
      lastError: null
    })
    recoveryState.attempt = 0
    recoveryState.history = []
  }
  
  console.log(`Previous Attempts: ${recoveryState.attempt}`)
  
  if (testResults) {
    console.log('\nTest Results:')
    console.log(`  Passed: ${testResults.testsPassed}/${testResults.testsRun}`)
    testResults.results
      .filter(r => !r.success)
      .forEach(r => console.log(`  ❌ ${r.name}: ${r.error?.substring(0, 100)}`))
  }
  
  const result = await prepareRetry(config, recoveryState, failureReason)
  return result
}

async function markSuccess() {
  const statePath = path.join(process.cwd(), '.recovery-state.json')
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath)
  }
  
  logRecovery({
    event: 'task_succeeded',
    time: new Date().toISOString()
  })
  
  console.log('✅ Task completed successfully. Recovery state cleared.')
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  if (command === 'success') {
    await markSuccess()
  } else if (command === 'fail') {
    const reason = args[1] || 'Unknown failure'
    const result = await handleFailure(reason)
    process.exit(result.action === 'escalate' ? 1 : 0)
  } else if (command === 'status') {
    const state = loadRecoveryState()
    console.log('Recovery Status:')
    console.log(`  Task: ${state.taskId || 'none'}`)
    console.log(`  Attempts: ${state.attempt}/${MAX_RETRIES}`)
    console.log(`  History: ${state.history.length} entries`)
    if (state.lastError) {
      console.log(`  Last Error: ${state.lastError.substring(0, 100)}`)
    }
  } else {
    console.log('Usage:')
    console.log('  node failure-recovery.js fail "reason"  - Handle failure')
    console.log('  node failure-recovery.js success        - Mark success')
    console.log('  node failure-recovery.js status         - Show status')
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Recovery error:', error)
    process.exit(1)
  })
}

module.exports = { handleFailure, markSuccess, loadRecoveryState }
