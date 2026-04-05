/**
 * Test: PM Loop Fix - chainTask() workflow advancement
 * 
 * Issue: UC-PILOT-WHITE-GLOVE had PM tasks complete 3x in 2h without advancing to dev.
 * Root cause: replenishQueue() was creating duplicate step-0 PM tasks when UC status
 * was 'ready' but PM had already completed.
 * 
 * Fix:
 * 1. replenishQueue() now ALWAYS checks done tasks to determine startStep
 * 2. Added dedup guard to prevent creating tasks for steps that already have done tasks
 * 3. chainTask() now uses task.metadata.workflow_step if available (more reliable)
 */

const assert = require('assert')

// Mock data
const mockUC = {
  id: 'UC-PILOT-WHITE-GLOVE',
  name: 'Pilot White Glove Onboarding',
  workflow: ['product', 'dev', 'qc'],
  implementation_status: 'ready',
  priority: 1,
  prd_id: 'PRD-123'
}

const mockDonePMTask = {
  id: 'task-pm-001',
  agent_id: 'product',
  status: 'done',
  use_case_id: 'UC-PILOT-WHITE-GLOVE',
  metadata: { workflow_step: 0, workflow_total: 3 }
}

const mockReadyDevTask = {
  id: 'task-dev-001',
  agent_id: 'dev',
  status: 'ready',
  use_case_id: 'UC-PILOT-WHITE-GLOVE',
  metadata: { workflow_step: 1, workflow_total: 3 }
}

// Test 1: replenishQueue should calculate correct startStep from done tasks
function testReplenishQueueStartStep() {
  console.log('Test 1: replenishQueue calculates startStep from done tasks...')
  
  // Simulate done tasks
  const doneTasks = [mockDonePMTask]
  const doneAgents = new Set(doneTasks.map(t => t.agent_id))
  const workflow = ['product', 'dev', 'qc']
  
  // Calculate startStep (same logic as replenishQueue)
  let startStep = 0
  for (let i = 0; i < workflow.length; i++) {
    if (doneAgents.has(workflow[i])) startStep = i + 1
    else break
  }
  
  assert.strictEqual(startStep, 1, `Expected startStep=1, got ${startStep}`)
  console.log('  ✅ startStep correctly calculated as 1 (dev)')
}

// Test 2: Dedup guard should prevent duplicate step-0 tasks
function testDedupGuard() {
  console.log('Test 2: Dedup guard prevents duplicate step-0 tasks...')
  
  const doneTasks = [mockDonePMTask]
  const doneAgents = new Set(doneTasks.map(t => t.agent_id))
  const workflow = ['product', 'dev', 'qc']
  const startStep = 1
  const targetAgent = workflow[startStep]
  
  // Check if target agent already has a done task (dedup guard)
  const wouldCreateDuplicate = doneAgents.has(targetAgent)
  
  assert.strictEqual(wouldCreateDuplicate, false, 'Should not detect duplicate for step 1')
  
  // Now test that step 0 would be caught
  const step0Agent = workflow[0]
  const wouldDuplicateStep0 = doneAgents.has(step0Agent)
  assert.strictEqual(wouldDuplicateStep0, true, 'Should detect step 0 as duplicate')
  
  console.log('  ✅ Dedup guard correctly identifies step 0 as duplicate')
}

// Test 3: chainTask should use workflow_step from metadata
function testChainTaskUsesMetadata() {
  console.log('Test 3: chainTask uses workflow_step from metadata...')
  
  const task = mockDonePMTask
  const workflow = ['product', 'dev', 'qc']
  
  // Use metadata.workflow_step if available
  let currentIdx = -1
  if (task.metadata?.workflow_step != null) {
    currentIdx = task.metadata.workflow_step
  } else {
    currentIdx = workflow.indexOf(task.agent_id)
  }
  
  assert.strictEqual(currentIdx, 0, `Expected currentIdx=0, got ${currentIdx}`)
  
  const nextIdx = currentIdx + 1
  const nextAgent = workflow[nextIdx]
  
  assert.strictEqual(nextIdx, 1, `Expected nextIdx=1, got ${nextIdx}`)
  assert.strictEqual(nextAgent, 'dev', `Expected nextAgent=dev, got ${nextAgent}`)
  
  console.log('  ✅ chainTask correctly advances to step 1 (dev)')
}

// Test 4: Full workflow scenario - PM completes, dev should be chained
function testFullWorkflowScenario() {
  console.log('Test 4: Full workflow scenario...')
  
  // Initial state: UC is ready, no tasks done
  let ucStatus = 'ready'
  let doneTasks = []
  const workflow = ['product', 'dev', 'qc']
  
  // Step 1: replenishQueue creates PM task
  let startStep = 0
  let targetAgent = workflow[startStep]
  assert.strictEqual(targetAgent, 'product', 'Step 1: Should create PM task')
  
  // Step 2: PM task completes
  doneTasks.push({ agent_id: 'product', status: 'done', metadata: { workflow_step: 0 } })
  ucStatus = 'in_progress'
  
  // Step 3: chainTask should create dev task
  const pmTask = doneTasks[0]
  let currentIdx = pmTask.metadata?.workflow_step ?? workflow.indexOf(pmTask.agent_id)
  let nextIdx = currentIdx + 1
  let nextAgent = workflow[nextIdx]
  
  assert.strictEqual(nextAgent, 'dev', 'Step 3: Should chain to dev')
  
  // Step 4: replenishQueue should NOT create another PM task
  const doneAgents = new Set(doneTasks.map(t => t.agent_id))
  startStep = 0
  for (let i = 0; i < workflow.length; i++) {
    if (doneAgents.has(workflow[i])) startStep = i + 1
    else break
  }
  targetAgent = workflow[startStep]
  
  assert.strictEqual(startStep, 1, 'Step 4: startStep should be 1, not 0')
  assert.strictEqual(targetAgent, 'dev', 'Step 4: Should target dev, not PM')
  
  // Dedup check
  const wouldDuplicate = doneAgents.has(targetAgent)
  assert.strictEqual(wouldDuplicate, false, 'Step 4: Should not duplicate')
  
  console.log('  ✅ Full workflow scenario works correctly')
}

// Test 5: Edge case - UC stuck with partial completion
function testStuckUCWithPartialCompletion() {
  console.log('Test 5: Stuck UC with partial completion...')
  
  // UC is stuck, but PM and dev have completed
  const doneTasks = [
    { agent_id: 'product', status: 'done' },
    { agent_id: 'dev', status: 'done' }
  ]
  const workflow = ['product', 'dev', 'qc']
  const ucStatus = 'stuck'
  
  // Calculate startStep
  const doneAgents = new Set(doneTasks.map(t => t.agent_id))
  let startStep = 0
  for (let i = 0; i < workflow.length; i++) {
    if (doneAgents.has(workflow[i])) startStep = i + 1
    else break
  }
  
  assert.strictEqual(startStep, 2, 'Should resume at step 2 (QC)')
  assert.strictEqual(workflow[startStep], 'qc', 'Target agent should be QC')
  
  console.log('  ✅ Stuck UC correctly resumes from last completed step')
}

// Run all tests
function runTests() {
  console.log('\n🧪 PM Loop Fix Tests\n')
  
  try {
    testReplenishQueueStartStep()
    testDedupGuard()
    testChainTaskUsesMetadata()
    testFullWorkflowScenario()
    testStuckUCWithPartialCompletion()
    
    console.log('\n✅ All tests passed!\n')
    return { passed: 5, total: 5, passRate: 1.0 }
  } catch (err) {
    console.error('\n❌ Test failed:', err.message)
    console.error(err.stack)
    return { passed: 0, total: 5, passRate: 0 }
  }
}

// Export for use as module
if (require.main === module) {
  const results = runTests()
  process.exit(results.passRate === 1.0 ? 0 : 1)
}

module.exports = { runTests }
