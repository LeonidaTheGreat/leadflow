/**
 * E2E test for PR #1048: satisfaction-ping API route table fix
 * Task: 84fedae6-89eb-44f6-b325-4452c25bbcfb
 *
 * Acceptance criteria: satisfaction-ping route must NOT query the non-existent
 * `agents` table. It must use `real_estate_agents`.
 *
 * Also checks: this branch actually changed the route file (not a no-op commit).
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROUTE_PATH = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts'
)

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`FAIL: ${name}`)
    console.error(`  ${err.message}`)
    failed++
  }
}

// Test 1: Route file exists
test('route.ts file exists', () => {
  assert.ok(fs.existsSync(ROUTE_PATH), `route.ts not found at ${ROUTE_PATH}`)
})

const routeContent = fs.existsSync(ROUTE_PATH) ? fs.readFileSync(ROUTE_PATH, 'utf-8') : ''

// Test 2: No reference to .from('agents')
test('route does NOT query the agents table', () => {
  const hasAgentsRef = routeContent.includes(".from('agents')") || routeContent.includes('.from("agents")')
  assert.ok(!hasAgentsRef, "Route still contains .from('agents') — bug not fixed")
})

// Test 3: Route queries real_estate_agents
test('route queries real_estate_agents table', () => {
  const hasCorrectTable =
    routeContent.includes(".from('real_estate_agents')") ||
    routeContent.includes('.from("real_estate_agents")')
  assert.ok(hasCorrectTable, "Route does not query real_estate_agents — fix not applied")
})

// Test 4: Both PATCH and GET handlers use real_estate_agents
test('both PATCH and GET use real_estate_agents', () => {
  const matches = (routeContent.match(/\.from\('real_estate_agents'\)/g) || []).length
  assert.ok(matches >= 2, `Expected 2 real_estate_agents references (PATCH + GET), found ${matches}`)
})

// Test 5: This PR branch actually changed the route file (not a no-op commit)
// Compare route.ts on this branch vs main
test('branch actually modifies the satisfaction-ping route file', () => {
  let diffOutput = ''
  try {
    diffOutput = execSync(
      'git diff main...HEAD -- product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts',
      { cwd: path.join(__dirname, '..'), encoding: 'utf-8' }
    )
  } catch (e) {
    diffOutput = e.stdout || ''
  }
  // If diff is empty, the branch made NO changes to the route — fail
  assert.ok(
    diffOutput.trim().length > 0,
    'Branch made NO changes to satisfaction-ping/route.ts — acceptance criteria not met (no-op commit)'
  )
})

// Test 6: Diff does not contain from('agents') being added
test('diff does not introduce agents table reference', () => {
  let diffOutput = ''
  try {
    diffOutput = execSync(
      "git diff main...HEAD -- product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts",
      { cwd: path.join(__dirname, '..'), encoding: 'utf-8' }
    )
  } catch (e) {
    diffOutput = e.stdout || ''
  }
  const addedLines = diffOutput.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'))
  const badLine = addedLines.find(l => l.includes(".from('agents')") || l.includes('.from("agents")'))
  assert.ok(!badLine, `Diff introduces agents table reference: ${badLine}`)
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
