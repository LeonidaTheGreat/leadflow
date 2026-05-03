'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const cronRoutePath = path.join(
  __dirname, '..', '..', 'product', 'lead-response', 'dashboard',
  'app', 'api', 'cron', 'nps-surveys', 'route.ts'
)
const npsServicePath = path.join(
  __dirname, '..', '..', 'product', 'lead-response', 'dashboard',
  'lib', 'nps-service.ts'
)

const cronRouteContent = fs.readFileSync(cronRoutePath, 'utf8')
const npsServiceContent = fs.readFileSync(npsServicePath, 'utf8')

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`)
    failed++
  }
}

console.log('\n=== NPS cron pipeline ===\n')

// --- Cron route: CRON_SECRET read per-request ---

check('CRON_SECRET is read inside GET handler, not at module level', () => {
  const lines = cronRouteContent.split('\n')
  const getHandlerLine = lines.findIndex(l => /export async function GET/.test(l))
  assert.ok(getHandlerLine >= 0, 'GET handler not found')

  const moduleLevel = lines.slice(0, getHandlerLine)
  const insideHandler = lines.slice(getHandlerLine)

  const moduleLevelRead = moduleLevel.some(l =>
    /process\.env\.CRON_SECRET/.test(l) && !/\/\//.test(l.split('process.env')[0])
  )
  assert.ok(!moduleLevelRead, 'CRON_SECRET is read at module level (should be inside handler)')

  const handlerRead = insideHandler.some(l => /process\.env\.CRON_SECRET/.test(l))
  assert.ok(handlerRead, 'CRON_SECRET is not read inside GET handler')
})

check('cron route returns 503 when CRON_SECRET not configured', () => {
  assert.match(cronRouteContent, /CRON_SECRET not configured/)
  assert.match(cronRouteContent, /status:\s*503/)
})

check('cron route returns 401 for wrong bearer token', () => {
  assert.match(cronRouteContent, /Unauthorized/)
  assert.match(cronRouteContent, /status:\s*401/)
})

// --- NPS service: status filter ---

check('getAgentsDueForSurvey filters by agent status', () => {
  const fnStart = npsServiceContent.indexOf('export async function getAgentsDueForSurvey')
  assert.ok(fnStart >= 0, 'getAgentsDueForSurvey function not found')

  const fnEnd = npsServiceContent.indexOf('\nexport ', fnStart + 1)
  const fnBody = npsServiceContent.slice(fnStart, fnEnd > 0 ? fnEnd : undefined)

  assert.match(fnBody, /\.in\(\s*['"]real_estate_agents\.status['"]/, 'missing .in() status filter')
})

check('status filter includes active, onboarding, and pilot', () => {
  const fnStart = npsServiceContent.indexOf('export async function getAgentsDueForSurvey')
  const fnEnd = npsServiceContent.indexOf('\nexport ', fnStart + 1)
  const fnBody = npsServiceContent.slice(fnStart, fnEnd > 0 ? fnEnd : undefined)

  assert.match(fnBody, /['"]active['"]/, 'missing active status')
  assert.match(fnBody, /['"]onboarding['"]/, 'missing onboarding status')
  assert.match(fnBody, /['"]pilot['"]/, 'missing pilot status')
})

check('status filter does NOT include invited', () => {
  const fnStart = npsServiceContent.indexOf('export async function getAgentsDueForSurvey')
  const fnEnd = npsServiceContent.indexOf('\nexport ', fnStart + 1)
  const fnBody = npsServiceContent.slice(fnStart, fnEnd > 0 ? fnEnd : undefined)

  const hasInvited = /['"]invited['"]/.test(fnBody)
  assert.ok(!hasInvited, 'status filter should NOT include invited')
})

check('select includes status column for filtering', () => {
  const fnStart = npsServiceContent.indexOf('export async function getAgentsDueForSurvey')
  const fnEnd = npsServiceContent.indexOf('\nexport ', fnStart + 1)
  const fnBody = npsServiceContent.slice(fnStart, fnEnd > 0 ? fnEnd : undefined)

  assert.match(fnBody, /real_estate_agents!inner\(.*status/, 'select must include status column')
})

check('query still filters by next_survey_at <= now', () => {
  const fnStart = npsServiceContent.indexOf('export async function getAgentsDueForSurvey')
  const fnEnd = npsServiceContent.indexOf('\nexport ', fnStart + 1)
  const fnBody = npsServiceContent.slice(fnStart, fnEnd > 0 ? fnEnd : undefined)

  assert.match(fnBody, /\.lte\(\s*['"]next_survey_at['"]/, 'missing next_survey_at lte filter')
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
if (failed > 0) {
  process.exit(1)
}
