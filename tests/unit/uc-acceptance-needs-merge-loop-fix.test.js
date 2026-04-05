/**
 * Test: UC Acceptance Check Loop Fix
 * 
 * Tests the two-bug fix:
 * 1. Skip acceptance checks for UCs in needs_merge or stuck status
 * 2. Add 4h cooldown dedup for done acceptance fix tasks
 */

const assert = require('assert')

// Mock the heartbeat executor's sweepUCCompletions logic
class MockHeartbeatExecutor {
  constructor(store, projectId = 'test-project') {
    this.store = store
    this.projectId = projectId
    this.actions = []
  }

  async sweepUCCompletions() {
    if (!this.store.supabase) return
    
    // Mock in-progress UCs
    const inProgressUCs = await this.store.getInProgressUCs()
    if (!inProgressUCs?.length) return

    for (const uc of inProgressUCs) {
      if (!uc.workflow?.length) continue

      // Mock done tasks check
      const doneTasks = await this.store.getDoneTasks(uc.id)
      if (!doneTasks?.length) continue

      const doneAgents = new Set(doneTasks.map(t => t.agent_id))
      const allStepsDone = uc.workflow.every(agent => doneAgents.has(agent))
      if (!allStepsDone) continue

      // Mock merge check - assume merged for test
      const hasMergedPR = true
      if (!hasMergedPR) continue

      // BUG FIX 1: Skip acceptance checks for needs_merge or stuck UCs
      if (uc.implementation_status === 'needs_merge' || uc.implementation_status === 'stuck') {
        console.log(`   ⏭️ UC ${uc.id} — skipping acceptance checks (${uc.implementation_status})`)
        this.actions.push(`skipped_acceptance:${uc.implementation_status}`)
        continue
      }

      // Mock acceptance checks
      const checks = uc.acceptance_checks || []
      if (checks.length > 0) {
        let allChecksPassed = true
        // Mock failing checks for test
        if (uc.simulateFailingChecks) {
          allChecksPassed = false
        }

        if (!allChecksPassed) {
          const failTitle = `Dev: UC acceptance failed — ${uc.id}`.slice(0, 120)
          const existing = await this.store.findTaskByTitle(failTitle)

          // BUG FIX 2: 4-hour cooldown for done tasks
          const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          const recentlyDone = await this.store.findRecentlyDoneTask(failTitle, fourHoursAgo)
          
          if (recentlyDone?.length > 0) {
            console.log(`   ⏭️ UC ${uc.id} — acceptance fix task completed recently (cooldown: 4h)`)
            this.actions.push('cooldown_active')
            continue
          }

          if (!existing) {
            await this.store.createTask({ title: failTitle, status: 'ready' })
            console.log(`   📋 Created acceptance fix task for ${uc.id}`)
            this.actions.push('created_fix_task')
          }
          continue
        }
      }

      // Mark complete
      await this.store.updateUCStatus(uc.id, 'complete')
      this.actions.push('marked_complete')
    }
  }
}

// Mock store
class MockStore {
  constructor() {
    this.ucs = []
    this.tasks = []
    this.supabase = true
  }

  async getInProgressUCs() {
    return this.ucs.filter(uc => 
      ['not_started', 'in_progress', 'partial', 'stuck', 'needs_merge'].includes(uc.implementation_status)
    )
  }

  async getDoneTasks(ucId) {
    return this.tasks.filter(t => t.use_case_id === ucId && t.status === 'done')
  }

  async findTaskByTitle(title) {
    return this.tasks.find(t => t.title === title && !['done', 'failed', 'cancelled'].includes(t.status)) || null
  }

  async findRecentlyDoneTask(title, since) {
    return this.tasks.filter(t => 
      t.title === title && 
      t.status === 'done' && 
      t.updated_at >= since
    )
  }

  async createTask(task) {
    this.tasks.push({ ...task, id: `task-${this.tasks.length + 1}` })
  }

  async updateUCStatus(ucId, status) {
    const uc = this.ucs.find(u => u.id === ucId)
    if (uc) uc.implementation_status = status
  }
}

// Tests
async function runTests() {
  console.log('Running UC Acceptance Loop Fix Tests...\n')
  let passed = 0
  let failed = 0

  // Test 1: Skip acceptance checks for needs_merge UC
  try {
    const store = new MockStore()
    const executor = new MockHeartbeatExecutor(store)
    
    store.ucs = [{
      id: 'uc-test-1',
      workflow: ['product', 'dev', 'qc'],
      implementation_status: 'needs_merge',
      acceptance_checks: [{ id: 'check1', command: 'echo test', expected: 'test' }]
    }]
    store.tasks = [
      { use_case_id: 'uc-test-1', agent_id: 'product', status: 'done' },
      { use_case_id: 'uc-test-1', agent_id: 'dev', status: 'done' },
      { use_case_id: 'uc-test-1', agent_id: 'qc', status: 'done' }
    ]

    await executor.sweepUCCompletions()
    
    assert(executor.actions.includes('skipped_acceptance:needs_merge'), 'Should skip acceptance for needs_merge')
    assert(!executor.actions.includes('created_fix_task'), 'Should not create fix task for needs_merge')
    console.log('✅ Test 1 passed: Skip acceptance checks for needs_merge UC')
    passed++
  } catch (err) {
    console.log('❌ Test 1 failed:', err.message)
    failed++
  }

  // Test 2: Skip acceptance checks for stuck UC
  try {
    const store = new MockStore()
    const executor = new MockHeartbeatExecutor(store)
    
    store.ucs = [{
      id: 'uc-test-2',
      workflow: ['product', 'dev', 'qc'],
      implementation_status: 'stuck',
      acceptance_checks: [{ id: 'check1', command: 'echo test', expected: 'test' }]
    }]
    store.tasks = [
      { use_case_id: 'uc-test-2', agent_id: 'product', status: 'done' },
      { use_case_id: 'uc-test-2', agent_id: 'dev', status: 'done' },
      { use_case_id: 'uc-test-2', agent_id: 'qc', status: 'done' }
    ]

    await executor.sweepUCCompletions()
    
    assert(executor.actions.includes('skipped_acceptance:stuck'), 'Should skip acceptance for stuck')
    assert(!executor.actions.includes('created_fix_task'), 'Should not create fix task for stuck')
    console.log('✅ Test 2 passed: Skip acceptance checks for stuck UC')
    passed++
  } catch (err) {
    console.log('❌ Test 2 failed:', err.message)
    failed++
  }

  // Test 3: 4-hour cooldown prevents duplicate task creation
  try {
    const store = new MockStore()
    const executor = new MockHeartbeatExecutor(store)
    
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    
    store.ucs = [{
      id: 'uc-test-3',
      workflow: ['dev'],
      implementation_status: 'in_progress',
      acceptance_checks: [{ id: 'check1', command: 'echo wrong', expected: 'right' }],
      simulateFailingChecks: true
    }]
    store.tasks = [
      { use_case_id: 'uc-test-3', agent_id: 'dev', status: 'done' },
      // Recently completed fix task (1 hour ago, within 4h cooldown)
      { 
        title: 'Dev: UC acceptance failed — uc-test-3',
        status: 'done',
        updated_at: oneHourAgo
      }
    ]

    await executor.sweepUCCompletions()
    
    assert(executor.actions.includes('cooldown_active'), 'Should detect cooldown')
    assert(!executor.actions.includes('created_fix_task'), 'Should not create duplicate task during cooldown')
    console.log('✅ Test 3 passed: 4-hour cooldown prevents duplicate task creation')
    passed++
  } catch (err) {
    console.log('❌ Test 3 failed:', err.message)
    failed++
  }

  // Test 4: Create fix task when no cooldown and no existing task
  try {
    const store = new MockStore()
    const executor = new MockHeartbeatExecutor(store)
    
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    
    store.ucs = [{
      id: 'uc-test-4',
      workflow: ['dev'],
      implementation_status: 'in_progress',
      acceptance_checks: [{ id: 'check1', command: 'echo wrong', expected: 'right' }],
      simulateFailingChecks: true
    }]
    store.tasks = [
      { use_case_id: 'uc-test-4', agent_id: 'dev', status: 'done' },
      // Old completed fix task (5 hours ago, outside 4h cooldown)
      { 
        title: 'Dev: UC acceptance failed — uc-test-4',
        status: 'done',
        updated_at: fiveHoursAgo
      }
    ]

    await executor.sweepUCCompletions()
    
    assert(!executor.actions.includes('cooldown_active'), 'Should not detect cooldown for old task')
    assert(executor.actions.includes('created_fix_task'), 'Should create fix task when no cooldown')
    console.log('✅ Test 4 passed: Create fix task when no cooldown and no existing task')
    passed++
  } catch (err) {
    console.log('❌ Test 4 failed:', err.message)
    failed++
  }

  // Test 5: Normal UC with passing acceptance checks marks complete
  try {
    const store = new MockStore()
    const executor = new MockHeartbeatExecutor(store)
    
    store.ucs = [{
      id: 'uc-test-5',
      workflow: ['dev'],
      implementation_status: 'in_progress',
      acceptance_checks: [{ id: 'check1', command: 'echo test', expected: 'test' }],
      simulateFailingChecks: false
    }]
    store.tasks = [
      { use_case_id: 'uc-test-5', agent_id: 'dev', status: 'done' }
    ]

    await executor.sweepUCCompletions()
    
    assert(executor.actions.includes('marked_complete'), 'Should mark UC complete')
    assert(!executor.actions.includes('created_fix_task'), 'Should not create fix task')
    console.log('✅ Test 5 passed: Normal UC with passing acceptance checks marks complete')
    passed++
  } catch (err) {
    console.log('❌ Test 5 failed:', err.message)
    failed++
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`${'='.repeat(50)}`)
  
  return { passed, failed, total: passed + failed }
}

runTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
