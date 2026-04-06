/**
 * E2E Test: fix-satisfaction-ping-agents-table-reference
 * Verifies that satisfaction-ping route uses real_estate_agents table, not agents
 * Regression guard: task fb88b987 — 2 from('agents') references were silently breaking the toggle
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const routePath = path.resolve(__dirname, '../../product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts')

let passed = 0, failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`)
    failed++
  }
}

async function run() {
  console.log('\n=== E2E: Satisfaction Ping — agents table reference fix ===\n')

  const routeContent = fs.readFileSync(routePath, 'utf8')

  await test('satisfaction-ping route file exists', async () => {
    assert(fs.existsSync(routePath), 'route.ts not found')
  })

  await test('PATCH handler uses real_estate_agents table', async () => {
    // Find the PATCH handler section
    const patchMatch = routeContent.match(/export async function PATCH[\s\S]*?\.from\(['"](\w+)['"]\)/)
    assert(patchMatch, 'Could not find .from() call in PATCH handler')
    assert.strictEqual(patchMatch[1], 'real_estate_agents',
      `PATCH handler uses .from('${patchMatch[1]}') — must use real_estate_agents`)
  })

  await test('GET handler uses real_estate_agents table', async () => {
    const getMatch = routeContent.match(/export async function GET[\s\S]*?\.from\(['"](\w+)['"]\)/)
    assert(getMatch, 'Could not find .from() call in GET handler')
    assert.strictEqual(getMatch[1], 'real_estate_agents',
      `GET handler uses .from('${getMatch[1]}') — must use real_estate_agents`)
  })

  await test('no bare from(agents) references remain', async () => {
    const bareAgentsRefs = routeContent.match(/\.from\(['"]agents['"]\)/g)
    assert(!bareAgentsRefs, `Found ${(bareAgentsRefs || []).length} bare .from('agents') reference(s) — must all be real_estate_agents`)
  })

  await test('satisfaction_ping_enabled column referenced correctly', async () => {
    assert(routeContent.includes('satisfaction_ping_enabled'),
      'satisfaction_ping_enabled column not referenced in route')
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
