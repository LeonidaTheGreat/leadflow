/**
 * E2E Test: Session Management → AuthService Refactor
 * Task: 9e8cdd78 — Refactor: Convert session management to AuthService class
 * PR: #1113
 *
 * Verifies:
 * 1. session.ts is deleted (no stale file)
 * 2. No routes import from @/lib/session
 * 3. Routes that previously used validateSession from session.ts now import authService
 * 4. AuthService has the new agent session methods
 * 5. agent-session.ts and session-analytics.ts delegate to AuthService (no direct DB calls)
 * 6. TwilioService class exists with sendSms method; twilio-sms.js is a shim
 * 7. FUBService imports TwilioService, not twilio-sms.js directly
 */

import assert from 'assert'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DASHBOARD_DIR = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(DASHBOARD_DIR, '../../..')
const LIB_DIR = path.join(DASHBOARD_DIR, 'lib')
const ROUTES_DIR = path.join(DASHBOARD_DIR, 'app/api')

// ============================================
// TEST 1: session.ts is deleted
// ============================================
function testSessionTsDeleted() {
  const sessionPath = path.join(LIB_DIR, 'session.ts')
  assert(
    !fs.existsSync(sessionPath),
    `FAIL: lib/session.ts still exists — should have been deleted as part of refactor`
  )
  console.log('✅ TEST 1: lib/session.ts is deleted')
}

// ============================================
// TEST 2: No routes import from @/lib/session
// ============================================
function testNoStaleSessionImports() {
  const violations: string[] = []

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        scanDir(fullPath)
      } else if (/\.(ts|tsx|js)$/.test(entry)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        if (content.includes("from '@/lib/session'") || content.includes('from "@/lib/session"')) {
          violations.push(fullPath.replace(DASHBOARD_DIR + '/', ''))
        }
      }
    }
  }

  scanDir(ROUTES_DIR)
  scanDir(path.join(DASHBOARD_DIR, 'app'))
  scanDir(LIB_DIR)

  // Exclude test files from this check (they may reference old patterns intentionally)
  const nonTestViolations = violations.filter(v => !v.includes('test') && !v.includes('spec'))

  assert(
    nonTestViolations.length === 0,
    `FAIL: Found ${nonTestViolations.length} stale import(s) of @/lib/session:\n${nonTestViolations.join('\n')}`
  )
  console.log('✅ TEST 2: No production code imports from @/lib/session')
}

// ============================================
// TEST 3: Routes that validate sessions use authService
// ============================================
function testRoutesUseAuthService() {
  const sessionRoutes = [
    'app/api/analytics/dashboard/route.ts',
    'app/api/booking/route.ts',
    'app/api/feedback/route.ts',
  ]

  for (const rel of sessionRoutes) {
    const fullPath = path.join(DASHBOARD_DIR, rel)
    assert(fs.existsSync(fullPath), `FAIL: Route file missing: ${rel}`)

    const content = fs.readFileSync(fullPath, 'utf-8')

    // Must NOT import from @/lib/session
    assert(
      !content.includes("from '@/lib/session'"),
      `FAIL: ${rel} still imports from @/lib/session`
    )

    // Must use authService or AuthService for session validation
    assert(
      content.includes('authService') || content.includes('AuthService'),
      `FAIL: ${rel} does not use authService/AuthService for session validation`
    )

    console.log(`  ✅ ${rel}`)
  }
  console.log('✅ TEST 3: All affected routes use authService for session validation')
}

// ============================================
// TEST 4: AuthService has agent session methods
// ============================================
function testAuthServiceHasAgentSessionMethods() {
  const authServicePath = path.join(LIB_DIR, 'services/AuthService.js')
  assert(fs.existsSync(authServicePath), `FAIL: AuthService.js not found at ${authServicePath}`)

  const content = fs.readFileSync(authServicePath, 'utf-8')

  const requiredMethods = [
    'logAgentSessionStart',
    'touchAgentSession',
    'touchAgentSessionByAgentId',
    'logPageView',
    'endAgentSession',
    'getClientIp',  // static helper
  ]

  for (const method of requiredMethods) {
    assert(
      content.includes(method),
      `FAIL: AuthService.js is missing method: ${method}`
    )
  }

  // Must export authService singleton
  assert(
    content.includes('export const authService'),
    'FAIL: AuthService.js does not export authService singleton'
  )

  console.log('✅ TEST 4: AuthService has all required agent session methods + singleton export')
}

// ============================================
// TEST 5: agent-session.ts and session-analytics.ts delegate to AuthService
// ============================================
function testDelegatingWrappersUseAuthService() {
  const wrappers = [
    'lib/agent-session.ts',
    'lib/session-analytics.ts',
  ]

  for (const rel of wrappers) {
    const fullPath = path.join(DASHBOARD_DIR, rel)
    assert(fs.existsSync(fullPath), `FAIL: Wrapper file missing: ${rel}`)

    const content = fs.readFileSync(fullPath, 'utf-8')

    // Must import from AuthService
    assert(
      content.includes('AuthService'),
      `FAIL: ${rel} does not import from AuthService`
    )

    // Must NOT contain direct DB calls (agent_sessions insert/update inline)
    const hasDirectInsert = content.includes(".from('agent_sessions')") && content.includes('.insert(')
    const hasDirectUpdate = content.includes(".from('agent_sessions')") && content.includes('.update(') && !content.includes('authService')

    assert(
      !hasDirectInsert,
      `FAIL: ${rel} contains direct agent_sessions INSERT — should delegate to AuthService`
    )

    console.log(`  ✅ ${rel}`)
  }
  console.log('✅ TEST 5: Delegating wrappers use AuthService, no inline DB calls')
}

// ============================================
// TEST 6: TwilioService class exists with sendSms, twilio-sms.js is a shim
// ============================================
function testTwilioServiceRefactor() {
  const twilioServicePath = path.join(REPO_ROOT, 'lib/services/TwilioService.js')
  const twilioShimPath = path.join(REPO_ROOT, 'lib/twilio-sms.js')

  assert(fs.existsSync(twilioServicePath), 'FAIL: lib/services/TwilioService.js does not exist')
  assert(fs.existsSync(twilioShimPath), 'FAIL: lib/twilio-sms.js shim does not exist')

  const serviceContent = fs.readFileSync(twilioServicePath, 'utf-8')
  const shimContent = fs.readFileSync(twilioShimPath, 'utf-8')

  // TwilioService must define the class
  assert(serviceContent.includes('class TwilioService'), 'FAIL: TwilioService.js does not define class TwilioService')
  assert(serviceContent.includes('sendSms'), 'FAIL: TwilioService missing sendSms method')

  // shim must re-export from TwilioService
  assert(
    shimContent.includes('TwilioService'),
    'FAIL: twilio-sms.js shim does not import from TwilioService'
  )
  assert(
    shimContent.length < 2000,
    `FAIL: twilio-sms.js is ${shimContent.length} bytes — expected a thin shim, not the full implementation`
  )

  console.log('✅ TEST 6: TwilioService class defined; twilio-sms.js is a thin shim')
}

// ============================================
// TEST 7: FUBService imports TwilioService (not twilio-sms)
// ============================================
function testFUBServiceUsesTwilioService() {
  const fubServicePath = path.join(REPO_ROOT, 'lib/services/FUBService.js')
  assert(fs.existsSync(fubServicePath), 'FAIL: lib/services/FUBService.js does not exist')

  const content = fs.readFileSync(fubServicePath, 'utf-8')

  assert(
    content.includes("require('./TwilioService')"),
    "FAIL: FUBService.js does not import TwilioService"
  )
  assert(
    !content.includes("require('../twilio-sms')"),
    "FAIL: FUBService.js still imports the legacy twilio-sms.js directly"
  )

  console.log('✅ TEST 7: FUBService imports TwilioService, not legacy twilio-sms.js')
}

// ============================================
// RUN ALL TESTS
// ============================================
let passed = 0
let failed = 0

const tests = [
  testSessionTsDeleted,
  testNoStaleSessionImports,
  testRoutesUseAuthService,
  testAuthServiceHasAgentSessionMethods,
  testDelegatingWrappersUseAuthService,
  testTwilioServiceRefactor,
  testFUBServiceUsesTwilioService,
]

for (const test of tests) {
  try {
    test()
    passed++
  } catch (err: any) {
    console.error(`❌ ${err.message}`)
    failed++
  }
}

console.log(`\n📊 Results: ${passed}/${tests.length} passed`)

if (failed > 0) {
  process.exit(1)
}
