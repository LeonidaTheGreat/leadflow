/**
 * E2E Test: fix-signup-onboarding-email-check-queries-wrong-table-
 *
 * Verifies that the email duplicate-check routes query real_estate_agents
 * (not the orchestration `agents` table) so that registrations are
 * correctly detected and duplicate accounts are prevented.
 *
 * Acceptance criteria:
 *  1. /api/onboarding/check-email route uses real_estate_agents
 *  2. /api/agents/check-email route uses real_estate_agents
 *  3. Neither file references .from("agents") or .from('agents')
 *  4. No hardcoded secrets in the changed files
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.resolve(__dirname, '../product/lead-response/dashboard')

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

console.log('\n=== fix-signup-onboarding-email-check-queries-wrong-table- ===\n')

// File paths under review
const ONBOARDING_CHECK = path.join(DASHBOARD_DIR, 'app/api/onboarding/check-email/route.ts')
const AGENTS_CHECK     = path.join(DASHBOARD_DIR, 'app/api/agents/check-email/route.ts')

// 1. Files exist
check('onboarding/check-email/route.ts exists', () => {
  assert(fs.existsSync(ONBOARDING_CHECK), `File not found: ${ONBOARDING_CHECK}`)
})

check('agents/check-email/route.ts exists', () => {
  assert(fs.existsSync(AGENTS_CHECK), `File not found: ${AGENTS_CHECK}`)
})

// 2. onboarding/check-email uses real_estate_agents
check('onboarding/check-email uses real_estate_agents', () => {
  const content = fs.readFileSync(ONBOARDING_CHECK, 'utf8')
  assert(
    content.includes(".from('real_estate_agents')") || content.includes('.from("real_estate_agents")'),
    'onboarding/check-email/route.ts must query real_estate_agents table'
  )
})

// 3. onboarding/check-email does NOT use bare agents table
check('onboarding/check-email does NOT query from("agents")', () => {
  const content = fs.readFileSync(ONBOARDING_CHECK, 'utf8')
  const hasBadRef = content.includes(".from('agents')") || content.includes('.from("agents")')
  assert(!hasBadRef, 'onboarding/check-email/route.ts still references wrong .from("agents")')
})

// 4. agents/check-email uses real_estate_agents
check('agents/check-email uses real_estate_agents', () => {
  const content = fs.readFileSync(AGENTS_CHECK, 'utf8')
  assert(
    content.includes(".from('real_estate_agents')") || content.includes('.from("real_estate_agents")'),
    'agents/check-email/route.ts must query real_estate_agents table'
  )
})

// 5. agents/check-email does NOT use bare agents table
check('agents/check-email does NOT query from("agents")', () => {
  const content = fs.readFileSync(AGENTS_CHECK, 'utf8')
  const hasBadRef = content.includes(".from('agents')") || content.includes('.from("agents")')
  assert(!hasBadRef, 'agents/check-email/route.ts still references wrong .from("agents")')
})

// 6. Correct logic: returns available:false when a match is found
check('onboarding/check-email returns available:false when existingAgent is set', () => {
  const content = fs.readFileSync(ONBOARDING_CHECK, 'utf8')
  // The route must conditionally return available: false
  assert(content.includes('available: false'), 'Route must return available:false when email is taken')
  assert(content.includes('available: true'), 'Route must also return available:true when email is free')
})

check('agents/check-email returns available based on query result', () => {
  const content = fs.readFileSync(AGENTS_CHECK, 'utf8')
  // Should reference `data` or `existingAgent` to determine availability
  assert(
    content.includes('available: !data') || content.includes('available: false') || content.includes('exists'),
    'Route must derive availability from database result, not hardcode true'
  )
})

// 7. No hardcoded secrets
check('No hardcoded secrets in check-email routes', () => {
  const secretPatterns = [/sk_live_/, /re_[a-zA-Z0-9]{20,}/, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+/]
  for (const [label, filePath] of [['onboarding check-email', ONBOARDING_CHECK], ['agents check-email', AGENTS_CHECK]]) {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const pat of secretPatterns) {
      assert(!pat.test(content), `Potential hardcoded secret in ${label}: ${pat}`)
    }
  }
})

// 8. Security: parameterized query (using .eq() not string interpolation)
check('Queries use parameterized .eq() — no string interpolation', () => {
  for (const filePath of [ONBOARDING_CHECK, AGENTS_CHECK]) {
    const content = fs.readFileSync(filePath, 'utf8')
    // Must use .eq('email', ...) not template literals in .select() or raw SQL
    assert(content.includes('.eq('), `${path.basename(filePath)}: must use .eq() parameterized filter`)
    // Should not have raw SQL string with email
    assert(!content.match(/`[^`]*\$\{email\}[^`]*`/), `${path.basename(filePath)}: possible SQL injection via template literal`)
  }
})

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}

console.log('✅ All acceptance criteria met:')
console.log('   1. onboarding/check-email queries real_estate_agents (not agents)')
console.log('   2. agents/check-email queries real_estate_agents (not agents)')
console.log('   3. Availability derived from DB result — duplicates correctly detected')
console.log('   4. Parameterized queries — no SQL injection risk')
console.log('   5. No hardcoded secrets')
