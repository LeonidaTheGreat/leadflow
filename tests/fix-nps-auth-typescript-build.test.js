/**
 * Tests: NPS Routes Auth Fix (TypeScript Build Fix)
 * 
 * Verifies the NPS API routes use the correct session validation pattern
 * (leadflow_session cookie + validateSession) instead of the broken
 * supabase.auth.getSession() pattern that caused TypeScript build failures.
 * 
 * Root cause: The custom createClient() in lib/db.ts returns a mock where
 * auth.getSession() always returns { data: { session: null }, error: null }.
 * TypeScript infers session as type `null`, making session?.user type `never`,
 * causing compile-time errors.
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD = path.join(__dirname, '../product/lead-response/dashboard')
const NPS_DIR = path.join(DASHBOARD, 'app/api/nps')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${message}`)
    failed++
  }
}

function readRoute(name) {
  return fs.readFileSync(path.join(NPS_DIR, name, 'route.ts'), 'utf8')
}

console.log('\n📋 NPS Routes — Auth Pattern Fix\n')

const routes = ['dismiss', 'prompt-status', 'submit']

routes.forEach(route => {
  console.log(`  /api/nps/${route}`)
  const content = readRoute(route)

  assert(
    !content.includes('auth.getSession()'),
    'does NOT use supabase.auth.getSession() (broken pattern)'
  )
  assert(
    !content.includes("from '@supabase/supabase-js'"),
    'does NOT import from @supabase/supabase-js directly'
  )
  assert(
    content.includes('validateSession'),
    'uses validateSession from @/lib/session (correct pattern)'
  )
  assert(
    content.includes('leadflow_session'),
    'reads session from leadflow_session cookie'
  )
  assert(
    content.includes('401'),
    'returns 401 when no session token present'
  )
  console.log()
})

console.log('  Build type safety checks')
const dismissContent = readRoute('dismiss')
const promptContent = readRoute('prompt-status')
const submitContent = readRoute('submit')

assert(
  dismissContent.includes('session.userId') && !dismissContent.includes('session?.user'),
  'dismiss/route.ts uses session.userId (not session?.user which becomes never)'
)
assert(
  promptContent.includes('session.userId') && !promptContent.includes('session?.user'),
  'prompt-status/route.ts uses session.userId (not session?.user which becomes never)'
)
assert(
  submitContent.includes('session.userId') && !submitContent.includes('session?.user'),
  'submit/route.ts uses session.userId (not session?.user which becomes never)'
)

console.log('\n============================================================')
console.log('📊 TEST REPORT')
console.log('============================================================')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
console.log('============================================================\n')

process.exit(failed > 0 ? 1 : 0)
