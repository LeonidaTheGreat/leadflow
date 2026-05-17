/**
 * E2E test for PR #1048: satisfaction-ping API route table fix
 * Task: 84fedae6-89eb-44f6-b325-4452c25bbcfb
 *
 * Acceptance criteria: satisfaction-ping route must NOT query the non-existent
 * `agents` table. It must use `real_estate_agents`.
 *
 * Regression guard: verifies the correct table is used in the production code.
 * The git-diff check was removed — it permanently fails after the fix merges to
 * main. The invariant that matters is the code state, not git history.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROUTE_PATH = path.resolve(
  __dirname,
  '../../product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts'
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

// Test 5: satisfaction_ping_enabled column is referenced correctly
test('satisfaction_ping_enabled column is referenced in route', () => {
  assert.ok(
    routeContent.includes('satisfaction_ping_enabled'),
    'satisfaction_ping_enabled column not referenced in route'
  )
})

// Test 6: Route has both SELECT and UPDATE operations
test('route has both SELECT and UPDATE operations on real_estate_agents', () => {
  assert.ok(routeContent.includes('.select('), 'Route is missing a .select() call')
  assert.ok(routeContent.includes('.update('), 'Route is missing an .update() call')
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
