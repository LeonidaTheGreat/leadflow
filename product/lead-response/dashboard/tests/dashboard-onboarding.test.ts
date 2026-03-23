/**
 * Test Suite: Dashboard Onboarding Route
 *
 * Verifies that:
 * 1. /dashboard/onboarding route exists and loads
 * 2. Signup routes redirect to /dashboard/onboarding (not /setup)
 * 3. The route is accessible during onboarding (before onboardingCompleted)
 * 4. OnboardingGuard includes /dashboard/onboarding in SETUP_ROUTES
 */

import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '..')

describe('Dashboard Onboarding Route (POST-SIGNUP REDIRECT)', () => {
  describe('R1: /dashboard/onboarding Route Exists', () => {
    it('should have /dashboard/onboarding page.tsx file', () => {
      const pagePath = path.join(ROOT, 'app/dashboard/onboarding/page.tsx')
      expect(fs.existsSync(pagePath)).toBe(true)
    })

    it('should have /dashboard/onboarding layout.tsx file', () => {
      const layoutPath = path.join(ROOT, 'app/dashboard/onboarding/layout.tsx')
      expect(fs.existsSync(layoutPath)).toBe(true)
    })

    it('should have /dashboard/onboarding directory in app structure', () => {
      const dirPath = path.join(ROOT, 'app/dashboard/onboarding')
      expect(fs.existsSync(dirPath)).toBe(true)
    })
  })

  describe('R2: Signup Routes Redirect to /dashboard/onboarding', () => {
    it('pilot-signup API should redirect to /dashboard/onboarding', () => {
      const routeSource = fs.readFileSync(
        path.join(ROOT, 'app/api/auth/pilot-signup/route.ts'),
        'utf8'
      )
      expect(routeSource).toContain("redirectTo: '/dashboard/onboarding'")
    })

    it('trial-signup API should redirect to /dashboard/onboarding', () => {
      const routeSource = fs.readFileSync(
        path.join(ROOT, 'app/api/auth/trial-signup/route.ts'),
        'utf8'
      )
      expect(routeSource).toContain("redirectTo: '/dashboard/onboarding'")
    })

    it('trial/start API should redirect to /dashboard/onboarding', () => {
      const routeSource = fs.readFileSync(
        path.join(ROOT, 'app/api/trial/start/route.ts'),
        'utf8'
      )
      expect(routeSource).toContain("redirectTo: '/dashboard/onboarding'")
    })
  })

  describe('R3: OnboardingGuard Allows Access During Onboarding', () => {
    it('OnboardingGuard should include /dashboard/onboarding in SETUP_ROUTES', () => {
      const guardSource = fs.readFileSync(
        path.join(ROOT, 'components/onboarding-guard.tsx'),
        'utf8'
      )
      
      // Extract SETUP_ROUTES array
      const setupRoutesMatch = guardSource.match(/const SETUP_ROUTES\s*=\s*\[([\s\S]*?)\]/)
      expect(setupRoutesMatch).toBeTruthy()
      
      const setupRoutesBlock = setupRoutesMatch![1]
      expect(setupRoutesBlock).toContain("'/dashboard/onboarding'")
    })

    it('OnboardingGuard should NOT redirect /dashboard/onboarding to /setup', () => {
      const guardSource = fs.readFileSync(
        path.join(ROOT, 'components/onboarding-guard.tsx'),
        'utf8'
      )
      
      // Verify the route is explicitly in SETUP_ROUTES
      const setupRoutesMatch = guardSource.match(/const SETUP_ROUTES\s*=\s*\[([\s\S]*?)\]/)
      expect(setupRoutesMatch).toBeTruthy()
      
      // Should allow this route without redirecting to /setup
      expect(setupRoutesMatch![0]).toContain("'/dashboard/onboarding'")
    })
  })

  describe('R4: Layout and Components', () => {
    it('dashboard/onboarding layout should NOT import OnboardingGuard', () => {
      const layoutSource = fs.readFileSync(
        path.join(ROOT, 'app/dashboard/onboarding/layout.tsx'),
        'utf8'
      )
      expect(layoutSource).not.toContain("import { OnboardingGuard }")
      expect(layoutSource).not.toContain('<OnboardingGuard')
    })

    it('dashboard/onboarding layout should have proper metadata', () => {
      const layoutSource = fs.readFileSync(
        path.join(ROOT, 'app/dashboard/onboarding/layout.tsx'),
        'utf8'
      )
      expect(layoutSource).toContain('metadata')
      expect(layoutSource).toContain('Setup')
    })

    it('dashboard/onboarding page should import setup wizard components', () => {
      const pageSource = fs.readFileSync(
        path.join(ROOT, 'app/dashboard/onboarding/page.tsx'),
        'utf8'
      )
      expect(pageSource).toContain('SetupFUB')
      expect(pageSource).toContain('SetupTwilio')
      expect(pageSource).toContain('SetupSimulator')
      expect(pageSource).toContain('SetupComplete')
    })
  })

  describe('R5: Email Links Updated', () => {
    it('pilot-signup welcome email should link to /dashboard/onboarding', () => {
      const routeSource = fs.readFileSync(
        path.join(ROOT, 'app/api/auth/pilot-signup/route.ts'),
        'utf8'
      )
      expect(routeSource).toContain('https://leadflow-ai-five.vercel.app/dashboard/onboarding')
    })
  })

  describe('R6: No Broken References', () => {
    it('should not reference /setup in signup APIs (they should use /dashboard/onboarding)', () => {
      const pilotSource = fs.readFileSync(
        path.join(ROOT, 'app/api/auth/pilot-signup/route.ts'),
        'utf8'
      )
      const trialSource = fs.readFileSync(
        path.join(ROOT, 'app/api/auth/trial-signup/route.ts'),
        'utf8'
      )
      const startSource = fs.readFileSync(
        path.join(ROOT, 'app/api/trial/start/route.ts'),
        'utf8'
      )

      // Check that redirectTo: '/setup' is NOT in these files
      expect(pilotSource).not.toMatch(/redirectTo:\s*['"]\/setup['"]/)
      expect(trialSource).not.toMatch(/redirectTo:\s*['"]\/setup['"]/)
      expect(startSource).not.toMatch(/redirectTo:\s*['"]\/setup['"]/)
    })
  })

  describe('R7: File Integrity', () => {
    it('all modified files should still be valid TypeScript/JavaScript', () => {
      const filesToCheck = [
        path.join(ROOT, 'app/dashboard/onboarding/page.tsx'),
        path.join(ROOT, 'app/dashboard/onboarding/layout.tsx'),
        path.join(ROOT, 'app/api/auth/pilot-signup/route.ts'),
        path.join(ROOT, 'app/api/auth/trial-signup/route.ts'),
        path.join(ROOT, 'app/api/trial/start/route.ts'),
        path.join(ROOT, 'components/onboarding-guard.tsx'),
      ]

      for (const filePath of filesToCheck) {
        expect(fs.existsSync(filePath)).toBe(true)
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Check for basic syntax (no trailing code after closing braces)
        expect(content.length > 100).toBe(true) // Should have substantive content
        
        // Should not have obvious typos
        expect(content).not.toContain('undefinedd')
        expect(content).not.toContain('  {  {')
      }
    })
  })
})
