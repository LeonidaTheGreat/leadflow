/**
 * TC-SIGNUP-AUTH-004: Cookie name consistency check
 * Verifies that /api/trial/start sets the cookie as 'auth-token' (hyphen)
 * to match all other auth routes and cookie readers — not 'auth_token' (underscore).
 *
 * Bug: trial/start was setting 'auth_token' (underscore) while /api/auth/pilot-status
 * and other readers use 'auth-token' (hyphen), causing auth failure in incognito/SSR.
 */

import * as fs from 'fs'
import * as path from 'path'

const TRIAL_START_FILE = path.resolve(
  __dirname,
  '../app/api/trial/start/route.ts'
)

const TRIAL_SIGNUP_FILE = path.resolve(
  __dirname,
  '../app/api/auth/trial-signup/route.ts'
)

const PILOT_SIGNUP_FILE = path.resolve(
  __dirname,
  '../app/api/auth/pilot-signup/route.ts'
)

const PILOT_STATUS_FILE = path.resolve(
  __dirname,
  '../app/api/auth/pilot-status/route.ts'
)

describe('TC-SIGNUP-AUTH-004: Cookie name consistency (auth-token hyphen)', () => {
  let trialStartSource: string
  let trialSignupSource: string
  let pilotSignupSource: string
  let pilotStatusSource: string

  beforeAll(() => {
    trialStartSource = fs.readFileSync(TRIAL_START_FILE, 'utf-8')
    trialSignupSource = fs.readFileSync(TRIAL_SIGNUP_FILE, 'utf-8')
    pilotSignupSource = fs.readFileSync(PILOT_SIGNUP_FILE, 'utf-8')
    pilotStatusSource = fs.readFileSync(PILOT_STATUS_FILE, 'utf-8')
  })

  it('trial/start sets cookie as auth-token (hyphen), not auth_token (underscore)', () => {
    // Should NOT contain the buggy underscore version in cookie.set calls
    expect(trialStartSource).not.toMatch(/cookies\.set\(['"]auth_token['"]/)

    // MUST contain the correct hyphen version
    expect(trialStartSource).toMatch(/cookies\.set\(['"]auth-token['"]/)
  })

  it('trial-signup sets cookie as auth-token (hyphen)', () => {
    expect(trialSignupSource).toMatch(/cookies\.set\(['"]auth-token['"]/)
    expect(trialSignupSource).not.toMatch(/cookies\.set\(['"]auth_token['"]/)
  })

  it('pilot-signup sets cookie as auth-token (hyphen)', () => {
    expect(pilotSignupSource).toMatch(/cookies\.set\(['"]auth-token['"]/)
    expect(pilotSignupSource).not.toMatch(/cookies\.set\(['"]auth_token['"]/)
  })

  it('pilot-status reads cookie as auth-token (hyphen)', () => {
    expect(pilotStatusSource).toMatch(/auth-token/)
    expect(pilotStatusSource).not.toMatch(/cookies\.get\(['"]auth_token['"]/)
  })

  it('all signup routes use consistent auth-token cookie name', () => {
    const routes = [
      { name: 'trial/start', source: trialStartSource },
      { name: 'trial-signup', source: trialSignupSource },
      { name: 'pilot-signup', source: pilotSignupSource },
    ]

    routes.forEach(({ name, source }) => {
      expect({
        route: name,
        hasHyphenCookie: /cookies\.set\(['"]auth-token['"]/.test(source),
        hasUnderscoreCookie: /cookies\.set\(['"]auth_token['"]/.test(source),
      }).toMatchObject({
        route: name,
        hasHyphenCookie: true,
        hasUnderscoreCookie: false,
      })
    })
  })
})
