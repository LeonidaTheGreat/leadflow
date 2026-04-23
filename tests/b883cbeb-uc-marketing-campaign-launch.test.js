/**
 * E2E Test: UC Marketing Campaign Launch — First Task Creation
 * UC: uc-marketing-campaign-launch
 * Task ID: 0cdcae05-50df-473c-9d27-2333c27bb952
 * PR: #1289
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const TASK_FILE = path.join(ROOT, 'agents/marketing/TASK-002-uc-marketing-campaign-launch.md')
const PRD_MRR = path.join(ROOT, 'docs/prd/PRD-MRR-GAP-ROOT-CAUSE-D80.md')
const PRD_EXEC = path.join(ROOT, 'docs/prd/PRD-PAYING-CUSTOMERS-EXECUTION-D80.md')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`)
    failed++
  }
}

async function testAsync(name, fn) {
  try {
    await fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`)
    failed++
  }
}

const taskContent = fs.existsSync(TASK_FILE) ? fs.readFileSync(TASK_FILE, 'utf8') : ''
const prdMrrContent = fs.existsSync(PRD_MRR) ? fs.readFileSync(PRD_MRR, 'utf8') : ''
const prdExecContent = fs.existsSync(PRD_EXEC) ? fs.readFileSync(PRD_EXEC, 'utf8') : ''

// AC1: Marketing task file exists
test('TASK-002 marketing task file exists', () => {
  assert.ok(fs.existsSync(TASK_FILE), `File not found: ${TASK_FILE}`)
})

// AC2: Task maps to use case
test('Task file references uc-marketing-campaign-launch', () => {
  assert.ok(taskContent.includes('uc-marketing-campaign-launch'), 'use_case reference missing')
})

// AC3: Goal of 10+ signups/day is explicit
test('Task file references 10 signups/day goal', () => {
  assert.ok(taskContent.includes('10'), 'Signup/day goal not referenced')
  assert.ok(taskContent.includes('signups'), 'Signups goal not mentioned')
})

// AC4: Task status is ready
test('Task status is ready', () => {
  assert.ok(taskContent.includes('status: ready'), 'Task status is not ready')
})

// AC5: Task has agent = marketing
test('Task assigned to marketing agent', () => {
  assert.ok(taskContent.includes('agent: marketing'), 'Task not assigned to marketing agent')
})

// AC6: PRD files exist
test('PRD-MRR-GAP-ROOT-CAUSE-D80 exists', () => {
  assert.ok(fs.existsSync(PRD_MRR), `PRD not found: ${PRD_MRR}`)
})

test('PRD-PAYING-CUSTOMERS-EXECUTION-D80 exists', () => {
  assert.ok(fs.existsSync(PRD_EXEC), `PRD not found: ${PRD_EXEC}`)
})

// AC7: PRD correctly identifies phantom MRR
test('MRR PRD identifies phantom $597 from test data', () => {
  assert.ok(prdMrrContent.includes('sub_test_'), 'Test subscription IDs not referenced')
  assert.ok(prdMrrContent.includes('$597'), 'Phantom MRR amount not mentioned')
})

// AC8: PRD has actionable fix for phantom MRR
test('MRR PRD contains DELETE query for phantom data fix', () => {
  assert.ok(prdMrrContent.includes('sub_test_%'), 'Cleanup SQL pattern not present')
})

// AC9: Execution PRD correctly identifies 3 human-required actions
test('Execution PRD covers Resend domain verification', () => {
  assert.ok(prdExecContent.includes('Resend'), 'Resend email fix not covered')
})

test('Execution PRD covers A2P 10DLC registration', () => {
  assert.ok(prdExecContent.includes('A2P'), 'A2P registration not covered')
})

test('Execution PRD covers pilot outreach for 20 invited agents', () => {
  assert.ok(prdExecContent.includes('20 invited') || prdExecContent.includes('status = \'invited\''), 'Invited agents outreach not covered')
})

// AC10: PRDs registered in prds table
test('Both PRDs registered in prds table', () => {
  const result = execSync(
    `psql postgresql://clawdbot@localhost/openclaw -t -c "SELECT COUNT(*) FROM prds WHERE project_id='leadflow' AND file_path IN ('docs/prd/PRD-MRR-GAP-ROOT-CAUSE-D80.md','docs/prd/PRD-PAYING-CUSTOMERS-EXECUTION-D80.md');"`,
    { encoding: 'utf8' }
  ).trim()
  const count = parseInt(result)
  assert.ok(count >= 2, `Expected 2 PRD rows in prds table, found ${count}`)
})

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
