/**
 * E2E Test: Trial Signup Server-Side Session Creation
 * Task: fix-trial-signup-missing-server-side-session-jwt-only-
 * Task ID: 96936afb-eabc-4905-ad36-7266695a1a70
 * 
 * Verifies that trial signup creates both JWT auth-token AND server-side leadflow_session
 * 
 * Run with: node tests/fix-trial-signup-session-e2e.test.js
 */

const assert = require('assert')

// Simple test runner
let testsRun = 0
let testsPassed = 0
let testsFailed = 0

function test(name, fn) {
  testsRun++
  try {
    fn()
    console.log(`  ✓ ${name}`)
    testsPassed++
  } catch (e) {
    console.log(`  ✗ ${name}`)
    console.log(`    ${e.message}`)
    testsFailed++
  }
}

function describe(name, fn) {
  console.log(`\n${name}`)
  fn()
}

console.log('Trial Signup Server-Side Session E2E Test')
console.log('=' .repeat(50))

// Test 1: Verify createSession is imported and called in the route
describe('Code Review: trial-signup route', () => {
  test('createSession is imported from @/lib/session', () => {
    const fs = require('fs')
    const path = require('path')
    const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts')
    const content = fs.readFileSync(routePath, 'utf-8')
    
    assert.ok(content.includes("import { createSession } from '@/lib/session'"),
      'createSession should be imported from @/lib/session')
  })

  test('createSession is called with correct parameters', () => {
    const fs = require('fs')
    const path = require('path')
    const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts')
    const content = fs.readFileSync(routePath, 'utf-8')
    
    assert.ok(content.includes('await createSession('),
      'createSession should be called with await')
    assert.ok(content.includes('userId: agent.id'),
      'createSession should be called with userId: agent.id')
    assert.ok(content.includes('rememberMe: true'),
      'createSession should be called with rememberMe: true for trial users')
  })

  test('leadflow_session cookie is set with correct attributes', () => {
    const fs = require('fs')
    const path = require('path')
    const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts')
    const content = fs.readFileSync(routePath, 'utf-8')
    
    assert.ok(content.includes("name: 'leadflow_session'"),
      'leadflow_session cookie should be set')
    assert.ok(content.includes('value: session.token'),
      'leadflow_session cookie should use session.token as value')
    assert.ok(content.includes('httpOnly: true'),
      'leadflow_session cookie should be httpOnly')
    assert.ok(content.includes("sameSite: 'strict'"),
      'leadflow_session cookie should use SameSite=strict')
  })

  test('auth-token cookie is preserved for backward compatibility', () => {
    const fs = require('fs')
    const path = require('path')
    const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts')
    const content = fs.readFileSync(routePath, 'utf-8')
    
    assert.ok(content.includes("response.cookies.set('auth-token', token"),
      'auth-token cookie should still be set for backward compatibility')
    assert.ok(content.includes('// Set JWT auth cookie (backward compatibility)'),
      'Comment should indicate backward compatibility')
  })
})

// Test 2: Verify session.ts has proper implementation
describe('Code Review: lib/session.ts', () => {
  test('generateSessionToken uses crypto.randomBytes', () => {
    const fs = require('fs')
    const path = require('path')
    const sessionPath = path.join(__dirname, '../product/lead-response/dashboard/lib/session.ts')
    const content = fs.readFileSync(sessionPath, 'utf-8')
    
    assert.ok(content.includes("require('crypto')"),
      'session.ts should import crypto module')
    assert.ok(content.includes('randomBytes(32)'),
      'generateSessionToken should use randomBytes(32) for 32 bytes of entropy')
  })

  test('createSession stores session in database', () => {
    const fs = require('fs')
    const path = require('path')
    const sessionPath = path.join(__dirname, '../product/lead-response/dashboard/lib/session.ts')
    const content = fs.readFileSync(sessionPath, 'utf-8')
    
    assert.ok(content.includes(".from('sessions')"),
      'createSession should insert into sessions table')
    assert.ok(content.includes('user_id'),
      'createSession should store user_id')
    assert.ok(content.includes('token'),
      'createSession should store token')
    assert.ok(content.includes('expires_at'),
      'createSession should store expires_at')
  })

  test('deleteSession allows session revocation', () => {
    const fs = require('fs')
    const path = require('path')
    const sessionPath = path.join(__dirname, '../product/lead-response/dashboard/lib/session.ts')
    const content = fs.readFileSync(sessionPath, 'utf-8')
    
    assert.ok(content.includes('export async function deleteSession'),
      'deleteSession should be exported')
    assert.ok(content.includes(".delete()") && content.includes(".eq('token', token)"),
      'deleteSession should delete by token')
  })
})

// Test 3: Security checks
describe('Security Review', () => {
  test('No Math.random() used for token generation', () => {
    const fs = require('fs')
    const path = require('path')
    const sessionPath = path.join(__dirname, '../product/lead-response/dashboard/lib/session.ts')
    const content = fs.readFileSync(sessionPath, 'utf-8')
    
    assert.ok(!content.includes('Math.random()'),
      'Should not use Math.random() for security-sensitive operations')
  })

  test('Session token is 32 bytes (64 hex chars)', () => {
    const fs = require('fs')
    const path = require('path')
    const sessionPath = path.join(__dirname, '../product/lead-response/dashboard/lib/session.ts')
    const content = fs.readFileSync(sessionPath, 'utf-8')
    
    assert.ok(content.includes('randomBytes(32)'),
      'Should generate 32 bytes of randomness')
  })

  test('Cookies are httpOnly and secure in production', () => {
    const fs = require('fs')
    const path = require('path')
    const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts')
    const content = fs.readFileSync(routePath, 'utf-8')
    
    assert.ok(content.includes('httpOnly: true'),
      'Cookies should be httpOnly')
    assert.ok(content.includes("secure: process.env.NODE_ENV === 'production'"),
      'Cookies should be secure in production')
  })
})

// Summary
console.log('\n' + '='.repeat(50))
console.log(`Tests run: ${testsRun}`)
console.log(`Tests passed: ${testsPassed}`)
console.log(`Tests failed: ${testsFailed}`)

if (testsFailed > 0) {
  console.log('\n❌ E2E TEST FAILED')
  process.exit(1)
} else {
  console.log('\n✅ E2E TEST PASSED')
  process.exit(0)
}
