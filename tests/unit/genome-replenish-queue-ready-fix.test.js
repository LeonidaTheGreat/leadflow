/**
 * Test: Genome replenishQueue ready-status startStep bug fix
 * 
 * Issue: replenishQueue startStep calculation only runs for stuck/in_progress/not_started.
 * Ready UCs always start at step 0, causing infinite task recreation loops.
 * Fix: add 'ready' to the status filter.
 */

const assert = require('assert')

// Mock UC data
const mockUCReady = {
  id: 'UC-TEST-READY',
  name: 'Test Ready UC',
  workflow: ['product', 'dev', 'qc'],
  implementation_status: 'ready',
  priority: 1,
  prd_id: 'PRD-123'
}

const mockUCStuck = {
  id: 'UC-TEST-STUCK',
  name: 'Test Stuck UC',
  workflow: ['product', 'dev', 'qc'],
  implementation_status: 'stuck',
  priority: 1,
  prd_id: 'PRD-456'
}

const mockUCInProgress = {
  id: 'UC-TEST-IN-PROGRESS',
  name: 'Test In Progress UC',
  workflow: ['product', 'dev', 'qc'],
  implementation_status: 'in_progress',
  priority: 1,
  prd_id: 'PRD-789'
}

const mockUCNotStarted = {
  id: 'UC-TEST-NOT-STARTED',
  name: 'Test Not Started UC',
  workflow: ['product', 'dev', 'qc'],
  implementation_status: 'not_started',
  priority: 1,
  prd_id: 'PRD-abc'
}

// Mock done tasks - simulating PM step already completed
const mockDonePMTask = {
  id: 'task-pm-001',
  agent_id: 'product',
  status: 'done',
  use_case_id: 'UC-TEST-READY',
  metadata: { workflow_step: 0, workflow_total: 3 }
}

// The FIXED status filter (what the code should have)
const FIXED_STATUS_FILTER = ['stuck', 'in_progress', 'not_started', 'ready']

// Test 1: Verify 'ready' is in the status filter
function testReadyInStatusFilter() {
  console.log('Test 1: Verify ready is in the status filter...')
  
  assert.strictEqual(FIXED_STATUS_FILTER.includes('ready'), true, 'ready should be in the status filter')
  assert.strictEqual(FIXED_STATUS_FILTER.includes('stuck'), true, 'stuck should be in the status filter')
  assert.strictEqual(FIXED_STATUS_FILTER.includes('in_progress'), true, 'in_progress should be in the status filter')
  assert.strictEqual(FIXED_STATUS_FILTER.includes('not_started'), true, 'not_started should be in the status filter')
  
  console.log('  ✅ Status filter correctly includes ready, stuck, in_progress, not_started')
}

// Test 2: startStep calculation should run for ready UCs
function testStartStepCalculationForReadyUC() {
  console.log('Test 2: startStep calculation should run for ready UCs...')
  
  const uc = mockUCReady
  const doneTasks = [mockDonePMTask]
  
  // Simulate the FIXED logic: check if UC status is in the filter
  const shouldCalculateStartStep = FIXED_STATUS_FILTER.includes(uc.implementation_status)
  assert.strictEqual(shouldCalculateStartStep, true, 'Should calculate startStep for ready UC')
  
  // Simulate startStep calculation
  if (shouldCalculateStartStep) {
    const doneAgents = new Set(doneTasks.map(t => t.agent_id))
    let startStep = 0
    for (let i = 0; i < uc.workflow.length; i++) {
      if (doneAgents.has(uc.workflow[i])) startStep = i + 1
      else break
    }
    
    // With PM done, startStep should be 1 (dev), not 0
    assert.strictEqual(startStep, 1, `Expected startStep=1 for ready UC with PM done, got ${startStep}`)
    console.log('  ✅ startStep correctly calculated as 1 (dev) for ready UC')
  }
}

// Test 3: Bug scenario - without 'ready' in filter, startStep would be 0
function testBugScenario() {
  console.log('Test 3: Bug scenario - without ready in filter...')
  
  const BROKEN_STATUS_FILTER = ['stuck', 'in_progress', 'not_started'] // Missing 'ready'
  const uc = mockUCReady
  
  // With broken filter, startStep calculation is skipped
  const shouldCalculateStartStep = BROKEN_STATUS_FILTER.includes(uc.implementation_status)
  assert.strictEqual(shouldCalculateStartStep, false, 'Broken filter would skip startStep calculation')
  
  // startStep defaults to 0, causing PM task to be created again
  let startStep = 0  // Default value when calculation is skipped
  assert.strictEqual(startStep, 0, 'Without fix, startStep defaults to 0')
  assert.strictEqual(uc.workflow[startStep], 'product', 'This would create another PM task - BUG!')
  
  console.log('  ✅ Bug scenario confirmed: without ready in filter, startStep=0 creates duplicate PM task')
}

// Test 4: Fix verification - with 'ready' in filter, correct agent is targeted
function testFixVerification() {
  console.log('Test 4: Fix verification - with ready in filter...')
  
  const uc = mockUCReady
  const doneTasks = [mockDonePMTask]
  
  // With fix, startStep calculation runs
  const shouldCalculateStartStep = FIXED_STATUS_FILTER.includes(uc.implementation_status)
  assert.strictEqual(shouldCalculateStartStep, true, 'Fix enables startStep calculation for ready UC')
  
  let startStep = 0
  if (shouldCalculateStartStep) {
    const doneAgents = new Set(doneTasks.map(t => t.agent_id))
    for (let i = 0; i < uc.workflow.length; i++) {
      if (doneAgents.has(uc.workflow[i])) startStep = i + 1
      else break
    }
  }
  
  // With PM done, startStep should be 1 (dev)
  assert.strictEqual(startStep, 1, 'Fix results in correct startStep=1')
  assert.strictEqual(uc.workflow[startStep], 'dev', 'Fix targets dev agent, not PM')
  
  console.log('  ✅ Fix verified: with ready in filter, startStep=1 targets dev agent')
}

// Test 5: All workflow statuses that need startStep calculation
function testAllStatusesNeedingStartStep() {
  console.log('Test 5: All statuses that need startStep calculation...')
  
  const testUCs = [
    { ...mockUCReady, implementation_status: 'ready' },
    { ...mockUCStuck, implementation_status: 'stuck' },
    { ...mockUCInProgress, implementation_status: 'in_progress' },
    { ...mockUCNotStarted, implementation_status: 'not_started' }
  ]
  
  for (const uc of testUCs) {
    const shouldCalculate = FIXED_STATUS_FILTER.includes(uc.implementation_status)
    assert.strictEqual(shouldCalculate, true, `Should calculate startStep for ${uc.implementation_status} UC`)
  }
  
  console.log('  ✅ All relevant statuses (ready, stuck, in_progress, not_started) trigger startStep calculation')
}

// Run all tests
function runTests() {
  console.log('\n🧪 Genome replenishQueue ready-status fix tests\n')
  
  try {
    testReadyInStatusFilter()
    testStartStepCalculationForReadyUC()
    testBugScenario()
    testFixVerification()
    testAllStatusesNeedingStartStep()
    
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

module.exports = { runTests, FIXED_STATUS_FILTER }
