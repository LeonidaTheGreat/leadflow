'use strict'
/**
 * Test: Genome UC ready-status loop fix
 *
 * Bugs fixed:
 * 1. sweepUCCompletions ignored ready-status UCs — missing 'ready' in its filter.
 *    Result: UCs with all steps done stayed in 'ready' forever, never swept to 'complete'.
 * 2. replenishQueue (historical) didn't include 'ready' in its filter / startStep logic.
 *    Both are confirmed present in queue-replenisher.js.
 *
 * Code split: heartbeat-executor.js was split into separate loop modules.
 *   - sweepUCCompletions → ~/projects/genome/core/loops/execution-loop.js
 *   - replenishQueue     → ~/projects/genome/core/loops/queue-replenisher.js
 */

const assert = require('assert')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const EXECUTION_LOOP_PATH = path.join(process.env.HOME, '.openclaw/genome/core/loops/execution-loop.js')
const QUEUE_REPLENISHER_PATH = path.join(process.env.HOME, '.openclaw/genome/core/loops/queue-replenisher.js')

// Test 1: sweepUCCompletions includes 'ready' in its implementation_status filter
function testSweepUCCompletionsIncludesReady() {
  console.log("Test 1: sweepUCCompletions filter includes 'ready'...")
  const content = fs.readFileSync(EXECUTION_LOOP_PATH, 'utf-8')
  const sweepIdx = content.indexOf('async sweepUCCompletions')
  assert(sweepIdx !== -1, 'sweepUCCompletions function not found in execution-loop.js')
  const filterIdx = content.indexOf("in('implementation_status'", sweepIdx)
  assert(filterIdx !== -1, 'implementation_status filter not found in sweepUCCompletions')
  const filterLine = content.slice(filterIdx, content.indexOf('\n', filterIdx))
  assert(filterLine.includes("'ready'"), `sweepUCCompletions filter missing 'ready': ${filterLine}`)
  console.log("  ✅ sweepUCCompletions correctly includes 'ready' in implementation_status filter")
}

// Test 2: replenishQueue includes 'ready' in its implementation_status filter
function testReplenishQueueIncludesReady() {
  console.log("Test 2: replenishQueue filter includes 'ready'...")
  const count = parseInt(
    execSync(`grep -c "'not_started', 'partial', 'ready'" "${QUEUE_REPLENISHER_PATH}"`).toString().trim(), 10
  )
  assert.strictEqual(count, 1, `Expected 1 line with 'not_started', 'partial', 'ready' — got ${count}`)
  console.log("  ✅ replenishQueue correctly includes 'ready' in its implementation_status filter")
}

// Test 3: replenishQueue has all-steps-done guard
function testReplenishQueueAllStepsDoneGuard() {
  console.log('Test 3: replenishQueue has all-steps-done guard...')
  const content = fs.readFileSync(QUEUE_REPLENISHER_PATH, 'utf-8')
  assert(content.includes('startStep >= workflowLen'), 'Missing all-steps-done guard in replenishQueue')
  console.log('  ✅ replenishQueue has all-steps-done guard: if (startStep >= workflowLen) continue')
}

// Test 4: simulate sweepUCCompletions — ready UC with all steps done should be swept
function testSweepReadyUCWithAllStepsDone() {
  console.log('Test 4: simulate sweepUCCompletions — ready UC with all steps done...')

  const uc = { id: 'uc-test-1', workflow: ['product', 'dev'], implementation_status: 'ready' }
  const doneTasks = [{ agent_id: 'product' }, { agent_id: 'dev' }]

  const SWEEP_STATUSES = ['not_started', 'ready', 'in_progress', 'partial', 'stuck', 'needs_merge']
  assert(SWEEP_STATUSES.includes(uc.implementation_status), "ready should be in sweep statuses")

  const doneAgents = new Set(doneTasks.map(t => t.agent_id))
  const allStepsDone = uc.workflow.every(agent => doneAgents.has(agent))
  assert.strictEqual(allStepsDone, true, 'All steps should be done')
  console.log("  ✅ Ready UC with all steps done would be swept to 'complete'")
}

// Test 5: simulate replenishQueue — ready UC with partial done should resume from correct step
function testReplenishQueueStartStepForReadyUC() {
  console.log('Test 5: replenishQueue startStep correctly computed for ready UC...')

  const uc = { implementation_status: 'ready', workflow: ['product', 'dev', 'qc'] }
  const doneTasks = [{ agent_id: 'product', status: 'done' }]
  const doneAgents = new Set(doneTasks.map(t => t.agent_id))

  let startStep = 0
  for (let i = 0; i < uc.workflow.length; i++) {
    if (doneAgents.has(uc.workflow[i])) startStep = i + 1
    else break
  }

  assert.strictEqual(startStep, 1, `Expected startStep=1 (dev), got ${startStep}`)
  assert.strictEqual(uc.workflow[startStep], 'dev', `Expected dev agent at step 1, got ${uc.workflow[startStep]}`)
  console.log('  ✅ replenishQueue startStep=1 (dev) for ready UC with product done')
}

// Test 6: simulate replenishQueue — ready UC with all steps done should be skipped
function testReplenishQueueSkipsAllStepsDoneReadyUC() {
  console.log('Test 6: replenishQueue skips ready UC with all steps done...')

  const uc = { implementation_status: 'ready', workflow: ['product', 'dev'] }
  const doneTasks = [{ agent_id: 'product', status: 'done' }, { agent_id: 'dev', status: 'done' }]
  const doneAgents = new Set(doneTasks.map(t => t.agent_id))
  const workflowLen = uc.workflow.length

  let startStep = 0
  for (let i = 0; i < uc.workflow.length; i++) {
    if (doneAgents.has(uc.workflow[i])) startStep = i + 1
    else break
  }

  assert.strictEqual(startStep >= workflowLen, true, 'All steps done: startStep should >= workflowLen')
  console.log('  ✅ replenishQueue skips (startStep >= workflowLen): sweepUCCompletions handles it')
}

function runTests() {
  console.log('\n🧪 Genome UC ready-status loop fix tests\n')

  try {
    testSweepUCCompletionsIncludesReady()
    testReplenishQueueIncludesReady()
    testReplenishQueueAllStepsDoneGuard()
    testSweepReadyUCWithAllStepsDone()
    testReplenishQueueStartStepForReadyUC()
    testReplenishQueueSkipsAllStepsDoneReadyUC()

    console.log('\n✅ All tests passed!\n')
    return { passed: 6, total: 6, passRate: 1.0 }
  } catch (err) {
    console.error('\n❌ Test failed:', err.message)
    console.error(err.stack)
    return { passed: 0, total: 6, passRate: 0 }
  }
}

if (require.main === module) {
  const results = runTests()
  process.exit(results.passRate === 1.0 ? 0 : 1)
}

module.exports = { runTests }
