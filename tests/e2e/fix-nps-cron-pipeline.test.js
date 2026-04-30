'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard')

const TEST_RESULTS = { passed: 0, failed: 0, tests: [] }

function test(name, fn) {
  try {
    fn()
    TEST_RESULTS.passed++
    TEST_RESULTS.tests.push({ name, status: 'PASSED' })
    console.log(`  PASS: ${name}`)
  } catch (error) {
    TEST_RESULTS.failed++
    TEST_RESULTS.tests.push({ name, status: 'FAILED', error: error.message })
    console.log(`  FAIL: ${name}: ${error.message}`)
  }
}

console.log('\nNPS Cron Pipeline Fix Tests\n')

test('nps-service.ts status filter includes onboarding agents', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/nps-service.ts'), 'utf8')
  assert.ok(
    content.includes(".in('real_estate_agents.status'"),
    'Should use .in() filter, not .eq()'
  )
  assert.ok(
    content.includes("'onboarding'"),
    'Status filter must include onboarding'
  )
  assert.ok(
    content.includes("'active'"),
    'Status filter must include active'
  )
  assert.ok(
    content.includes("'pilot'"),
    'Status filter must include pilot'
  )
})

test('nps-service.ts does NOT use .eq for status filter', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/nps-service.ts'), 'utf8')
  const lines = content.split('\n')
  const eqStatusLines = lines.filter(l =>
    l.includes(".eq('real_estate_agents.status'") || l.includes('.eq("real_estate_agents.status"')
  )
  assert.strictEqual(
    eqStatusLines.length,
    0,
    `Found .eq() status filter (should be .in()): ${eqStatusLines.join(', ')}`
  )
})

test('cron route checks CRON_SECRET at request time (not module level)', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/cron/nps-surveys/route.ts'),
    'utf8'
  )
  assert.ok(
    content.includes('process.env.CRON_SECRET'),
    'Must read CRON_SECRET from process.env'
  )
  assert.ok(
    content.includes('503'),
    'Must return 503 when CRON_SECRET not configured'
  )
  assert.ok(
    content.includes('401'),
    'Must return 401 on unauthorized request'
  )
})

test('cron route returns 503 JSON when CRON_SECRET missing', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/cron/nps-surveys/route.ts'),
    'utf8'
  )
  assert.ok(
    content.includes("CRON_SECRET not configured"),
    'Must include descriptive error message for missing CRON_SECRET'
  )
})

test('cron route calls getAgentsDueForSurvey', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/cron/nps-surveys/route.ts'),
    'utf8'
  )
  assert.ok(
    content.includes('getAgentsDueForSurvey'),
    'Must call getAgentsDueForSurvey from nps-service'
  )
})

test('getAgentsDueForSurvey function exists in nps-service', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/nps-service.ts'), 'utf8')
  assert.ok(
    content.includes('export async function getAgentsDueForSurvey'),
    'Must export getAgentsDueForSurvey'
  )
})

test('nps-service filters by next_survey_at <= now', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/nps-service.ts'), 'utf8')
  assert.ok(
    content.includes(".lte('next_survey_at'"),
    'Must filter agents where next_survey_at <= now'
  )
})

test('vercel.json has NPS cron schedule configured', () => {
  const vercelConfig = JSON.parse(
    fs.readFileSync(path.join(DASHBOARD_DIR, 'vercel.json'), 'utf8')
  )
  const npsCron = (vercelConfig.crons || []).find(c => c.path === '/api/cron/nps-surveys')
  assert.ok(npsCron, 'Must have NPS survey cron configured in vercel.json')
  assert.ok(npsCron.schedule, 'NPS cron must have a schedule')
})

// Print summary
console.log('\n' + '='.repeat(50))
console.log(`\nTest Results:`)
console.log(`   Passed: ${TEST_RESULTS.passed}`)
console.log(`   Failed: ${TEST_RESULTS.failed}`)
console.log(`   Total:  ${TEST_RESULTS.passed + TEST_RESULTS.failed}`)

if (TEST_RESULTS.failed > 0) {
  console.log('\nFailed Tests:')
  TEST_RESULTS.tests.filter(t => t.status === 'FAILED').forEach(t => {
    console.log(`   - ${t.name}: ${t.error}`)
  })
  process.exit(1)
} else {
  console.log('\nAll tests passed!')
  process.exit(0)
}
