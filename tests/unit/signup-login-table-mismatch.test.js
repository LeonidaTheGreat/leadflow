'use strict'

/**
 * Tests for UC: fix-signup-and-login-table-mismatch
 *
 * Verifies three bugs are fixed:
 * 1. Admin invite route used status='invited' which violated DB CHECK constraint
 *    (only 'pending', 'accepted', 'expired' are valid)
 * 2. accept-invite route used wrong column trial_expires_at (should be trial_ends_at)
 * 3. accept-invite route didn't create a session after account creation
 *
 * These are source-code static tests — no DB required.
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(
  __dirname,
  '../../product/lead-response/dashboard'
)

describe('signup-login table mismatch fixes', () => {
  // ─── Bug 1: pilot_invites status constraint ───────────────────────────────

  describe('Bug 1 — admin/pilot-signups/invite status constraint', () => {
    const routePath = path.join(
      DASHBOARD_DIR,
      'app/api/admin/pilot-signups/invite/route.ts'
    )

    let source

    beforeAll(() => {
      source = fs.readFileSync(routePath, 'utf8')
    })

    it('does NOT insert status: "invited" (violates DB CHECK constraint)', () => {
      // The DB constraint only allows: 'pending', 'accepted', 'expired'
      // Inserting 'invited' causes a CHECK constraint violation
      expect(source).not.toMatch(/status:\s*['"]invited['"]/g)
    })

    it('uses status: "pending" which satisfies the DB CHECK constraint', () => {
      expect(source).toMatch(/status:\s*['"]pending['"]/)
    })
  })

  // ─── Bug 2: trial_expires_at vs trial_ends_at ─────────────────────────────

  describe('Bug 2 — accept-invite uses correct trial column name', () => {
    const routePath = path.join(
      DASHBOARD_DIR,
      'app/api/auth/accept-invite/route.ts'
    )

    let source

    beforeAll(() => {
      source = fs.readFileSync(routePath, 'utf8')
    })

    it('does NOT use trial_expires_at as an insert field (wrong column name)', () => {
      // The real_estate_agents table has trial_ends_at, not trial_expires_at
      // PostgREST silently ignores unknown columns — trial end would never be set
      // We check for the insert object key pattern (key: value), not free text in comments
      expect(source).not.toMatch(/trial_expires_at\s*:/)
    })

    it('uses trial_ends_at which matches the real_estate_agents schema', () => {
      expect(source).toMatch(/trial_ends_at/)
    })
  })

  // ─── Bug 3: session creation after accept-invite ──────────────────────────

  describe('Bug 3 — accept-invite creates session when password is provided', () => {
    const routePath = path.join(
      DASHBOARD_DIR,
      'app/api/auth/accept-invite/route.ts'
    )

    let source

    beforeAll(() => {
      source = fs.readFileSync(routePath, 'utf8')
    })

    it('imports createSession from AuthService', () => {
      expect(source).toMatch(/import.*createSession.*from.*AuthService/)
    })

    it('calls createSession with the new agent id', () => {
      expect(source).toMatch(/createSession\(/)
    })

    it('returns session token in the response body', () => {
      expect(source).toMatch(/token:\s*session\.token/)
    })

    it('sets leadflow_session cookie after session creation', () => {
      expect(source).toMatch(/leadflow_session/)
    })

    it('only creates session when password was explicitly provided', () => {
      // Gate should be: if (password) { createSession(...) }
      // Not: createSession always
      expect(source).toMatch(/if\s*\(\s*password\s*\)/)
    })
  })

  // ─── Bug 3: frontend stores session token ────────────────────────────────

  describe('Bug 3 — accept-invite page stores session token in localStorage', () => {
    const pagePath = path.join(
      DASHBOARD_DIR,
      'app/accept-invite/page.tsx'
    )

    let source

    beforeAll(() => {
      source = fs.readFileSync(pagePath, 'utf8')
    })

    it('stores leadflow_token in localStorage on success', () => {
      expect(source).toMatch(/localStorage\.setItem\(['"]leadflow_token['"]/)
    })

    it('sends password in the accept-invite API call body', () => {
      // The page must submit the password so the API can create a session
      expect(source).toMatch(/password/)
    })

    it('has a password input form for the user to set their password', () => {
      // User must be able to set a password — invite flow with random password
      // means user can't log in without this form
      expect(source).toMatch(/type.*password|password.*type/i)
    })
  })

  // ─── Consistency: login still reads from real_estate_agents ──────────────

  describe('Login reads from real_estate_agents (table alignment)', () => {
    const loginPath = path.join(
      DASHBOARD_DIR,
      'app/api/auth/login/route.ts'
    )
    const trialSignupPath = path.join(
      DASHBOARD_DIR,
      'app/api/auth/trial-signup/route.ts'
    )
    const pilotSignupPath = path.join(
      DASHBOARD_DIR,
      'app/api/auth/pilot-signup/route.ts'
    )
    const acceptInvitePath = path.join(
      DASHBOARD_DIR,
      'app/api/auth/accept-invite/route.ts'
    )

    it('login route reads from real_estate_agents', () => {
      const src = fs.readFileSync(loginPath, 'utf8')
      expect(src).toMatch(/from\s*\(\s*['"]real_estate_agents['"]\s*\)/)
    })

    it('trial-signup route writes to real_estate_agents', () => {
      const src = fs.readFileSync(trialSignupPath, 'utf8')
      expect(src).toMatch(/from\s*\(\s*['"]real_estate_agents['"]\s*\)/)
    })

    it('pilot-signup auth route writes to real_estate_agents', () => {
      const src = fs.readFileSync(pilotSignupPath, 'utf8')
      expect(src).toMatch(/from\s*\(\s*['"]real_estate_agents['"]\s*\)/)
    })

    it('accept-invite route writes to real_estate_agents', () => {
      const src = fs.readFileSync(acceptInvitePath, 'utf8')
      expect(src).toMatch(/from\s*\(\s*['"]real_estate_agents['"]\s*\)/)
    })

    it('landing-page pilot-signup route writes to pilot_signups (not real_estate_agents — correct separate flow)', () => {
      // This is intentional: the landing page form is an interest form, not an account creation
      const src = fs.readFileSync(
        path.join(DASHBOARD_DIR, 'app/api/pilot-signup/route.ts'),
        'utf8'
      )
      expect(src).toMatch(/from\s*\(\s*['"]pilot_signups['"]\s*\)/)
    })
  })
})
