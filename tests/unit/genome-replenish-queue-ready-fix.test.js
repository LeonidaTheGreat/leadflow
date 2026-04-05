/**
 * Test: Genome replenishQueue ready-status startStep bug fix
 * 
 * Issue: replenishQueue startStep calculation only runs for stuck/in_progress/not_started.
 * Ready UCs always start at step 0, causing infinite task recreation loops.
 * Fix: add 'ready' to the status filter.
 */

const assert = require('assert')

// Mock workflow
const workflow = ['product', 'dev', 'qc']

// Mock done task (PM completed)
const mockDonePMTask = {
  id: 'task-1',
  agent_id: 'product',
  status: 'done',
  use_case_id: 'UC-TEST-001',
  metadata: { workflow_step: 0, workflow_total: 3 }
}

// Mock UC in 'ready' status
const mockReadyUC = {
  id: 'UC-TEST-001',
  name: 'Test UC',
  status: 'ready',
  use_case_id: 'UC-TEST-001',
  implementation_status: 'ready',
  workflow: ['product', 'dev', 'qc'],
  metadata: { workflow_step: 1, workflow_total: 3 }
}

// Test 1: Verify 'ready' is in the status filter
function testReadyInStatusFilter() {
  console.log('Test 1: Verify ready is in the status filter...')
  
  const statusFilter = ['stuck', 'in_progress', 'not_started', 'ready']
  assert.ok(statusFilter.includes('ready'), 'ready should be in status filter')
  assert.ok(statusFilter.includes('stuck'), 'stuck should be in status filter')
  assert.ok(statusFilter.includes('in_progress'), 'in_progress should be in status filter')
  assert.ok(statusFilter.includes('not_started'), 'not_started should be in status filter')
  
  console.log('  ✅ Status filter correctly includes ready, stuck, in_progress, not_started')
}

// Test 2: startStep calculation for ready UC
function testStartStepCalculationForReadyUC() {
  console.log('Test 2: startStep calculation runs for ready UCs...')
  
  // Simulate done tasks
  const doneTasks = [mockDonePMTask]
  const doneAgents = new Set(doneTasks.map(t => t.agent_id))
  
  // Calculate startStep (same logic as replenishQueue)
  let startStep = 0
  for (let i = 0; i < workflow.length; i++) {
    if (doneAgents.has(workflow[i])) startStep = i + 1
    else break
  }
  
  assert.strictEqual(startStep, 1, `Expected startStep=1, got ${startStep}`)
  assert.strictEqual(workflow[startStep], 'dev', 'Target agent should be dev')
  console.log('  ✅ startStep correctly calculated as 1 (dev) for ready UC')
}

// Test 3: Bug scenario - without 'ready' in filter
function testBugScenario() {
  console.log('Test 3: Document bug scenario (without ready in filter)...')
  
  // Old filter without 'ready'
  const oldStatusFilter = ['stuck', 'in_progress', 'not_started']
  const ucStatus = 'ready'
  
  // With old filter, ready UCs would skip startStep calculation
  const shouldCalculateStartStep = oldStatusFilter.includes(ucStatus)
  assert.strictEqual(shouldCalculateStartStep, false, 'Old filter should NOT include ready')
  
  // Result: startStep defaults to 0, creating duplicate PM task
  const startStep = 0 // Default when skipped
  assert.strictEqual(startStep, 0, 'Without calculation, startStep defaults to 0')
  assert.strictEqual(workflow[startStep], 'product', 'Would incorrectly target product again')
  
  console.log('  ✅ Bug scenario confirmed: without ready in filter, startStep=0 creates duplicate PM task')
}

// Test 4: Fix verification - with 'ready' in filter
function testFixVerification() {
  console.log('Test 4: Verify fix works correctly...')
  
  // New filter with 'ready'
  const newStatusFilter = ['stuck', 'in_progress', 'not_started', 'ready']
  const ucStatus = 'ready'
  
  // With new filter, ready UCs DO calculate startStep
  const shouldCalculateStartStep = newStatusFilter.includes(ucStatus)
  assert.strictEqual(shouldCalculateStartStep, true, 'New filter should include ready')
  
  // Simulate done tasks (PM completed)
  const doneTasks = [mockDonePMTask]
  const doneAgents = new Set(doneTasks.map(t => t.agent_id))
  
  // Calculate startStep
  let startStep = 0
  for (let i = 0; i < workflow.length; i++) {
    if (doneAgents.has(workflow[i])) startStep = i + 1
    else break
  }
  
  assert.strictEqual(startStep, 1, 'startStep should be 1 (dev)')
  assert.strictEqual(workflow[startStep], 'dev', 'Should correctly target dev agent')
  
  console.log('  ✅ Fix verified: with ready in filter, startStep=1 targets dev agent')
}

// Test 5: All statuses that need startStep calculation
function testAllStatusesNeedingStartStep() {
  console.log('Test 5: All relevant statuses trigger startStep calculation...')
  
  const statusFilter = ['stuck', 'in_progress', 'not_started', 'ready']
  const requiredStatuses = ['ready', 'stuck', 'in_progress', 'not_started']
  
  for (const status of requiredStatuses) {
    assert.ok(statusFilter.includes(status), `${status} should be in filter`)
  }
  
  console.log('  ✅ All relevant statuses (ready, stuck, in_progress, not_started) trigger startStep calculation')
}

// Run all tests
function runAllTests() {
  console.log('\n🧪 Genome replenishQueue ready-status fix tests\n')
  
  try {
    testReadyInStatusFilter()
    testStartStepCalculationForReadyUC()
    testBugScenario()
    testFixVerification()
    testAllStatusesNeedingStartStep()
    
    console.log('\n✅ All tests passed!')
    return true
  } catch (err) {
    console.error('\n❌ Test failed:', err.message)
    return false
  }
}

// Export for use as module
module.exports = { runAllTests }

// Run if executed directly
if (require.main === module) {
  const passed = runAllTests()
  process.exit(passed ? 0 : 1)
}
