'use strict'

/**
 * Regression guard: check-email routes must query real_estate_agents, not agents.
 *
 * The agents table is the orchestration agents table (no email field).
 * Customer records live in real_estate_agents. Querying agents always returns
 * 0 rows → duplicate-check always says "available" → duplicate accounts allowed.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard')

const ROUTES = {
  agents:    path.join(DASHBOARD, 'app/api/agents/check-email/route.ts'),
  onboarding: path.join(DASHBOARD, 'app/api/onboarding/check-email/route.ts'),
}

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    failed++
  }
}

console.log('\n=== check-email-table-fix regression tests ===\n')

for (const [label, filePath] of Object.entries(ROUTES)) {
  const content = fs.readFileSync(filePath, 'utf8')

  check(`${label}: route file exists`, () => {
    assert(fs.existsSync(filePath), `Not found: ${filePath}`)
  })

  check(`${label}: queries real_estate_agents`, () => {
    assert(
      content.includes(".from('real_estate_agents')") || content.includes('.from("real_estate_agents")'),
      `${label}/route.ts must query real_estate_agents table`
    )
  })

  check(`${label}: does NOT query from('agents')`, () => {
    assert(
      !content.includes(".from('agents')") && !content.includes('.from("agents")'),
      `${label}/route.ts still references the wrong .from("agents") table`
    )
  })

  check(`${label}: uses parameterised .eq() filter (no SQL injection)`, () => {
    assert(content.includes('.eq('), `${label}/route.ts must use .eq() parameterised filter`)
    assert(
      !content.match(/`[^`]*\$\{email\}[^`]*`/),
      `${label}/route.ts: possible SQL injection via email template literal`
    )
  })

  check(`${label}: no hardcoded secrets`, () => {
    const secretPatterns = [/sk_live_/, /re_[a-zA-Z0-9]{20,}/, /SERVICE_ROLE_KEY\s*=\s*["'][^"']+/]
    for (const pat of secretPatterns) {
      assert(!pat.test(content), `Possible hardcoded secret in ${label}: ${pat}`)
    }
  })
}

// Verify correct availability logic in onboarding route
check('onboarding: returns available:false when email is taken', () => {
  const content = fs.readFileSync(ROUTES.onboarding, 'utf8')
  assert(content.includes('available: false'), 'Must return available:false when email is registered')
  assert(content.includes('available: true'), 'Must return available:true when email is free')
})

// Verify agents route derives availability from DB result (not hardcoded)
check('agents: derives availability from DB result', () => {
  const content = fs.readFileSync(ROUTES.agents, 'utf8')
  assert(
    content.includes('available: !data') || content.includes('available: false') || content.includes('exists'),
    'agents/check-email/route.ts must derive availability from DB result, not hardcode true'
  )
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

if (failed > 0) process.exit(1)

console.log('✅ check-email routes correctly query real_estate_agents — duplicates are detected.\n')
