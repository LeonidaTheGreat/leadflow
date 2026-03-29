/**
 * Tests: fix-trial-status-uses-auth-helper
 * Task: ff9088d5-fix-genome-breach-project-quality-genome
 * 
 * Verifies that trial-status endpoint uses getAuthUserId() helper
 * instead of manually accessing auth-token cookie, per codebase rule:
 * "no-auth-token-only" — all auth routes must use lib/auth.ts getAuthUserId()
 */

import * as fs from 'fs'
import * as path from 'path'
import * as assert from 'assert'

const ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

// ---------------------------------------------------------------------------
// AC-1: trial-status imports getAuthUserId from @/lib/auth
// ---------------------------------------------------------------------------
describe('trial-status-uses-auth-helper', () => {
  it('AC-1: imports getAuthUserId from @/lib/auth', () => {
    const src = readFile('app/api/auth/trial-status/route.ts')
    assert.ok(
      src.includes("import { getAuthUserId } from '@/lib/auth'"),
      'trial-status/route.ts missing getAuthUserId import from @/lib/auth'
    )
  })

  // ---------------------------------------------------------------------------
  // AC-2: trial-status calls getAuthUserId(request) instead of manual cookie access
  // ---------------------------------------------------------------------------
  it('AC-2: calls getAuthUserId(request) in handler', () => {
    const src = readFile('app/api/auth/trial-status/route.ts')
    assert.ok(
      src.includes('await getAuthUserId(request)') || 
      src.includes('getAuthUserId(request)'),
      'trial-status/route.ts missing getAuthUserId(request) call'
    )
  })

  // ---------------------------------------------------------------------------
  // AC-3: trial-status does NOT directly access auth-token cookie
  // ---------------------------------------------------------------------------
  it('AC-3: does not directly access auth-token cookie', () => {
    const src = readFile('app/api/auth/trial-status/route.ts')
    // Check that the old pattern is gone
    assert.ok(
      !src.includes("request.cookies.get('auth-token')"),
      'trial-status/route.ts still contains direct auth-token cookie access'
    )
  })

  // ---------------------------------------------------------------------------
  // AC-4: trial-status does NOT import jwt or other auth utilities manually
  // ---------------------------------------------------------------------------
  it('AC-4: does not import jwt for manual JWT verification', () => {
    const src = readFile('app/api/auth/trial-status/route.ts')
    // The helper should handle JWT verification internally
    const hasJwtImport = src.includes("import jwt from 'jsonwebtoken'")
    const hasJWTPayloadInterface = src.includes('interface JWTPayload')
    
    // If JWT is imported, it should NOT be used with auth-token
    if (hasJwtImport || hasJWTPayloadInterface) {
      assert.ok(
        !src.includes('jwt.verify(jwtToken'),
        'trial-status/route.ts manually verifies JWT instead of using getAuthUserId'
      )
    }
  })

  // ---------------------------------------------------------------------------
  // AC-5: trial-status uses leadflow_session through getAuthUserId helper
  // ---------------------------------------------------------------------------
  it('AC-5: delegates session lookup to getAuthUserId helper', () => {
    const src = readFile('app/api/auth/trial-status/route.ts')
    // Should NOT manually query sessions table
    const hasManualSessionLookup = src.includes(
      ".from('sessions')"
    ) && src.includes('leadflow_session')
    
    assert.ok(
      !hasManualSessionLookup,
      'trial-status/route.ts manually looks up sessions instead of using getAuthUserId'
    )
  })

  // ---------------------------------------------------------------------------
  // AC-6: lib/auth.ts exports getAuthUserId
  // ---------------------------------------------------------------------------
  it('AC-6: lib/auth.ts exports getAuthUserId', () => {
    const src = readFile('lib/auth.ts')
    assert.ok(
      src.includes('export async function getAuthUserId'),
      'lib/auth.ts missing getAuthUserId export'
    )
  })

  // ---------------------------------------------------------------------------
  // AC-7: lib/auth.ts handles both auth methods (JWT + session)
  // ---------------------------------------------------------------------------
  it('AC-7: lib/auth.ts handles both JWT and session auth', () => {
    const src = readFile('lib/auth.ts')
    assert.ok(
      src.includes("'auth-token'"),
      'lib/auth.ts missing auth-token cookie handling'
    )
    assert.ok(
      src.includes("'leadflow_session'"),
      'lib/auth.ts missing leadflow_session cookie handling'
    )
  })
})
