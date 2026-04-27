'use strict'

/**
 * E2E test: Security audit — all /api/debug and /api/admin routes must be protected.
 * Task: 536f5ed5-baae-418c-9220-8a99ff9cbd2f
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const DASHBOARD_ROOT = path.join(ROOT, 'product/lead-response/dashboard')

const targetedRoutes = [
  'app/api/debug/ai-config/route.ts',
  'app/api/debug/env/route.ts',
  'app/api/debug/fub-test/route.ts',
  'app/api/debug/test-formdata/route.ts',
  'app/api/debug/test-fub-flow/route.ts',
  'app/api/debug/test-full-flow/route.ts',
  'app/api/debug/test-twilio-flow/route.ts',
  'app/api/debug/twilio-raw/route.ts',
  'app/api/admin/conversations/route.ts',
  'app/api/admin/demo-link/route.ts',
  'app/api/admin/pilot-campaigns/route.ts',
  'app/api/admin/pilot-campaigns/[id]/stats/route.ts',
  'app/api/admin/pilot-campaigns/[id]/targets/route.ts',
  'app/api/admin/pilot-signups/invite/route.ts',
  'app/api/admin/pilot-targets/[id]/route.ts',
  'app/api/admin/simulate-lead/route.ts',
  'app/api/smoke/stripe-checkout-e2e/route.ts',
]

describe('Security audit: /api/debug and /api/admin routes must be protected', () => {
  describe('[1] Route audit script', () => {
    test('check-debug-routes.js exits 0', () => {
      const script = path.join(ROOT, 'scripts/check-debug-routes.js')
      expect(fs.existsSync(script)).toBe(true)
      const output = execSync(`node ${script}`, { encoding: 'utf8' })
      expect(output).toContain('PASS: no unprotected /api/debug/* or /api/admin/* routes found.')
    })
  })

  describe('[2] Route files contain requirePrivilegedRouteAuth', () => {
    for (const rel of targetedRoutes) {
      test(`${rel} imports and calls requirePrivilegedRouteAuth`, () => {
        const fullPath = path.join(DASHBOARD_ROOT, rel)
        expect(fs.existsSync(fullPath)).toBe(true)
        const content = fs.readFileSync(fullPath, 'utf8')
        expect(content).toContain("from '@/lib/security/privileged-route-auth'")
        expect(content).toContain('requirePrivilegedRouteAuth(request)')
        expect(content).toContain('if (unauthorized) return unauthorized')
      })
    }
  })

  describe('[3] privileged-route-auth.ts security properties', () => {
    const authFile = path.join(DASHBOARD_ROOT, 'lib/security/privileged-route-auth.ts')

    test('privileged-route-auth.ts exists', () => {
      expect(fs.existsSync(authFile)).toBe(true)
    })

    test('uses crypto.timingSafeEqual', () => {
      const content = fs.readFileSync(authFile, 'utf8')
      expect(content).toContain('timingSafeEqual')
    })

    test('guards against empty-string bypass in safeEqual', () => {
      const content = fs.readFileSync(authFile, 'utf8')
      expect(content).toContain('if (!a || !b) return false')
    })

    test('exports requirePrivilegedRouteAuth', () => {
      const content = fs.readFileSync(authFile, 'utf8')
      expect(content).toContain('export async function requirePrivilegedRouteAuth')
    })

    test('returns null on success, NextResponse on failure', () => {
      const content = fs.readFileSync(authFile, 'utf8')
      expect(content).toContain('return null')
      expect(content).toContain("NextResponse.json({ error: 'Unauthorized' }, { status: 401 })")
    })
  })

  describe('[4] No unprotected handler exports (belt-and-suspenders check)', () => {
    test('no unprotected debug/ route files', () => {
      const debugDir = path.join(DASHBOARD_ROOT, 'app/api/debug')
      const routeFiles = []
      function walk(dir) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name)
          if (e.isDirectory()) walk(full)
          else if (e.name === 'route.ts') routeFiles.push(full)
        }
      }
      walk(debugDir)
      for (const f of routeFiles) {
        const content = fs.readFileSync(f, 'utf8')
        expect(content).toContain('requirePrivilegedRouteAuth')
      }
    })

    test('no unprotected admin/ route files', () => {
      const AUTH_CHECKS = [
        'requirePrivilegedRouteAuth(',
        'isAdminUser(',
        'await auth(',
        "headers.get('authorization')",
        'headers.get("authorization")',
        "headers.get('x-admin-token')",
        'headers.get("x-admin-token")',
        'isAdmin(',
        'isAuthorized(',
        'verifyAdminAuth(',
        'requireAdmin',
      ]
      const adminDir = path.join(DASHBOARD_ROOT, 'app/api/admin')
      const routeFiles = []
      function walk(dir) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name)
          if (e.isDirectory()) walk(full)
          else if (e.name === 'route.ts') routeFiles.push(full)
        }
      }
      walk(adminDir)
      for (const f of routeFiles) {
        const content = fs.readFileSync(f, 'utf8')
        const hasExport = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/.test(content)
        if (!hasExport) continue
        const isProtected = AUTH_CHECKS.some(check => content.includes(check))
        expect(isProtected).toBe(true)
      }
    })
  })
})
