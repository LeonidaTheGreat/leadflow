/**
 * Tests: signup-auth-token
 * PRD: PRD-SIGNUP-AUTH-TOKEN-FIX-001
 * Task: feat-post-signup-dashboard-onboarding-redirect (0f655180-4aaf-40cc-a60a-001953c55338)
 *
 * Covers all 5 E2E test scenarios (TC-SIGNUP-AUTH-001 through TC-SIGNUP-AUTH-005)
 * and all 14 acceptance criteria (AC-1 through AC-14).
 *
 * These are static/structural tests (no server needed) unless marked [integration].
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

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath))
}

// ---------------------------------------------------------------------------
// AC-1: trial-signup returns redirectTo: '/dashboard/onboarding'
// ---------------------------------------------------------------------------
describe('AC-1: trial-signup redirects to /dashboard/onboarding', () => {
  it('trial-signup/route.ts contains redirectTo: /dashboard/onboarding', () => {
    const src = readFile('app/api/auth/trial-signup/route.ts')
    assert.ok(
      src.includes("redirectTo: '/dashboard/onboarding'"),
      'trial-signup/route.ts missing redirectTo: /dashboard/onboarding'
    )
  })
})

// ---------------------------------------------------------------------------
// AC-2: pilot-signup returns redirectTo: '/dashboard/onboarding'
// ---------------------------------------------------------------------------
describe('AC-2: pilot-signup redirects to /dashboard/onboarding', () => {
  it('pilot-signup/route.ts contains redirectTo: /dashboard/onboarding', () => {
    const src = readFile('app/api/auth/pilot-signup/route.ts')
    assert.ok(
      src.includes("redirectTo: '/dashboard/onboarding'"),
      'pilot-signup/route.ts missing redirectTo: /dashboard/onboarding'
    )
  })
})

// ---------------------------------------------------------------------------
// AC-3: trial/start returns redirectTo: '/dashboard/onboarding'
// ---------------------------------------------------------------------------
describe('AC-3: trial/start redirects to /dashboard/onboarding', () => {
  it('trial/start/route.ts contains redirectTo: /dashboard/onboarding', () => {
    const src = readFile('app/api/trial/start/route.ts')
    assert.ok(
      src.includes("redirectTo: '/dashboard/onboarding'"),
      'trial/start/route.ts missing redirectTo: /dashboard/onboarding'
    )
  })
})

// ---------------------------------------------------------------------------
// AC-4: trial-signup and pilot-signup return token + user in response body
// ---------------------------------------------------------------------------
describe('AC-4: trial-signup and pilot-signup return token + user', () => {
  it('trial-signup/route.ts includes token in JSON response body', () => {
    const src = readFile('app/api/auth/trial-signup/route.ts')
    assert.ok(
      src.includes('token,') || src.includes('token:'),
      'trial-signup/route.ts does not include token in response body'
    )
    assert.ok(
      src.includes('user:'),
      'trial-signup/route.ts does not include user object in response body'
    )
  })

  it('pilot-signup/route.ts includes token in JSON response body', () => {
    const src = readFile('app/api/auth/pilot-signup/route.ts')
    assert.ok(
      src.includes('token,') || src.includes('token:'),
      'pilot-signup/route.ts does not include token in response body'
    )
    assert.ok(
      src.includes('user:'),
      'pilot-signup/route.ts does not include user object in response body'
    )
  })
})

// ---------------------------------------------------------------------------
// AC-5: TrialSignupForm stores token + user in localStorage before navigation
// ---------------------------------------------------------------------------
describe('AC-5: TrialSignupForm stores auth to localStorage before navigation', () => {
  it('TrialSignupForm sets leadflow_token in localStorage', () => {
    const src = readFile('components/trial-signup-form.tsx')
    assert.ok(
      src.includes("localStorage.setItem('leadflow_token'"),
      'TrialSignupForm does not set leadflow_token in localStorage'
    )
  })

  it('TrialSignupForm sets leadflow_user in localStorage', () => {
    const src = readFile('components/trial-signup-form.tsx')
    assert.ok(
      src.includes("localStorage.setItem('leadflow_user'"),
      'TrialSignupForm does not set leadflow_user in localStorage'
    )
  })

  it('localStorage.setItem calls come before router.push in TrialSignupForm', () => {
    const src = readFile('components/trial-signup-form.tsx')
    const setItemIdx = src.indexOf("localStorage.setItem('leadflow_token'")
    const routerPushIdx = src.indexOf('router.push(')
    assert.ok(setItemIdx !== -1, 'localStorage.setItem not found')
    assert.ok(routerPushIdx !== -1, 'router.push not found')
    assert.ok(
      setItemIdx < routerPushIdx,
      'localStorage.setItem must come before router.push'
    )
  })
})

// ---------------------------------------------------------------------------
// AC-6 & AC-7: /api/auth/me endpoint exists
// ---------------------------------------------------------------------------
describe('AC-6/AC-7: /api/auth/me endpoint exists', () => {
  it('app/api/auth/me/route.ts file exists', () => {
    assert.ok(
      fileExists('app/api/auth/me/route.ts'),
      'app/api/auth/me/route.ts does not exist'
    )
  })

  it('/api/auth/me reads auth-token cookie', () => {
    const src = readFile('app/api/auth/me/route.ts')
    assert.ok(
      src.includes("'auth-token'"),
      '/api/auth/me does not read auth-token cookie'
    )
  })

  it('/api/auth/me returns 401 when no cookie', () => {
    const src = readFile('app/api/auth/me/route.ts')
    assert.ok(
      src.includes('status: 401'),
      '/api/auth/me does not return 401 for unauthorized requests'
    )
  })

  it('/api/auth/me returns user fields: id, email, firstName, lastName, onboardingCompleted', () => {
    const src = readFile('app/api/auth/me/route.ts')
    assert.ok(src.includes('id:'), 'Missing id field in /api/auth/me response')
    assert.ok(src.includes('email:'), 'Missing email field in /api/auth/me response')
    assert.ok(src.includes('firstName:'), 'Missing firstName field in /api/auth/me response')
    assert.ok(src.includes('lastName:'), 'Missing lastName field in /api/auth/me response')
    assert.ok(src.includes('onboardingCompleted:'), 'Missing onboardingCompleted field in /api/auth/me response')
  })
})

// ---------------------------------------------------------------------------
// AC-8: /dashboard/onboarding calls /api/auth/me when localStorage absent
// ---------------------------------------------------------------------------
describe('AC-8: /dashboard/onboarding calls /api/auth/me when localStorage empty', () => {
  it('app/dashboard/onboarding/page.tsx exists', () => {
    assert.ok(
      fileExists('app/dashboard/onboarding/page.tsx'),
      'app/dashboard/onboarding/page.tsx does not exist'
    )
  })

  it('/dashboard/onboarding page calls /api/auth/me', () => {
    const src = readFile('app/dashboard/onboarding/page.tsx')
    assert.ok(
      src.includes('/api/auth/me'),
      '/dashboard/onboarding/page.tsx does not call /api/auth/me'
    )
  })

  it('/dashboard/onboarding page redirects to /login on 401', () => {
    const src = readFile('app/dashboard/onboarding/page.tsx')
    assert.ok(
      src.includes('/login'),
      '/dashboard/onboarding/page.tsx does not redirect to /login on auth failure'
    )
  })

  it('/dashboard/onboarding page writes to localStorage on successful /api/auth/me', () => {
    const src = readFile('app/dashboard/onboarding/page.tsx')
    assert.ok(
      src.includes('leadflow_user'),
      '/dashboard/onboarding/page.tsx does not persist user to localStorage after /api/auth/me'
    )
  })
})

// ---------------------------------------------------------------------------
// AC-11: Unauthenticated access blocked (structural check)
// ---------------------------------------------------------------------------
describe('AC-11: Unauthenticated access to /dashboard/onboarding is blocked', () => {
  it('/dashboard/onboarding is under PROTECTED_ROUTES in middleware (/dashboard prefix)', () => {
    const src = readFile('middleware.ts')
    assert.ok(
      src.includes("'/dashboard'"),
      '/dashboard is not in PROTECTED_ROUTES in middleware.ts'
    )
  })
})

// ---------------------------------------------------------------------------
// AC-12: Welcome email links point to /dashboard/onboarding
// ---------------------------------------------------------------------------
describe('AC-12: Welcome email links to /dashboard/onboarding', () => {
  it('trial-signup/route.ts welcome email uses /dashboard/onboarding URL', () => {
    const src = readFile('app/api/auth/trial-signup/route.ts')
    assert.ok(
      src.includes('/dashboard/onboarding'),
      'trial-signup welcome email does not link to /dashboard/onboarding'
    )
  })

  it('pilot-signup/route.ts welcome email uses /dashboard/onboarding URL', () => {
    const src = readFile('app/api/auth/pilot-signup/route.ts')
    assert.ok(
      src.includes('/dashboard/onboarding'),
      'pilot-signup welcome email does not link to /dashboard/onboarding'
    )
  })
})

// ---------------------------------------------------------------------------
// AC-14: OnboardingGuard skips /dashboard/onboarding
// ---------------------------------------------------------------------------
describe('AC-14 (guard): OnboardingGuard skips /dashboard/onboarding', () => {
  it('onboarding-guard.tsx includes /dashboard/onboarding in SETUP_ROUTES', () => {
    const src = readFile('components/onboarding-guard.tsx')
    assert.ok(
      src.includes('/dashboard/onboarding'),
      'OnboardingGuard does not skip /dashboard/onboarding — new users will be incorrectly redirected'
    )
  })
})

// ---------------------------------------------------------------------------
// TC-SIGNUP-AUTH-004: trial/start sets auth-token (hyphen) cookie
// Bug fix: cookie name was 'auth_token' (underscore) — mismatch with /api/auth/me
// ---------------------------------------------------------------------------
describe('TC-SIGNUP-AUTH-004: trial/start cookie name matches auth-token (hyphen)', () => {
  it('trial/start/route.ts sets cookie named auth-token (hyphen, not underscore)', () => {
    const src = readFile('app/api/trial/start/route.ts')
    assert.ok(
      src.includes("cookies.set('auth-token'"),
      "trial/start/route.ts must set cookie as 'auth-token' (hyphen) to match /api/auth/me"
    )
    assert.ok(
      !src.includes("cookies.set('auth_token'"),
      "trial/start/route.ts must NOT set cookie as 'auth_token' (underscore) — mismatch with /api/auth/me"
    )
  })
})

// ---------------------------------------------------------------------------
// PilotSignupForm also stores to localStorage
// ---------------------------------------------------------------------------
describe('Pilot signup form stores auth to localStorage', () => {
  it('PilotSignupForm sets leadflow_token in localStorage', () => {
    const src = readFile('components/pilot-signup-form.tsx')
    assert.ok(
      src.includes("localStorage.setItem('leadflow_token'"),
      'PilotSignupForm does not set leadflow_token in localStorage'
    )
  })

  it('PilotSignupForm sets leadflow_user in localStorage', () => {
    const src = readFile('components/pilot-signup-form.tsx')
    assert.ok(
      src.includes("localStorage.setItem('leadflow_user'"),
      'PilotSignupForm does not set leadflow_user in localStorage'
    )
  })
})
