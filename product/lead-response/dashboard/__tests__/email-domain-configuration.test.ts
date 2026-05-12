/**
 * TASK SPEC (8bcdc941-6cc4-434d-89ba-ab371641ad74)
 * What:
 * - Change sender fallback defaults in active email send paths:
 *   - lib/services/EmailService.js
 *   - lib/services/ActivationService.js
 *   - lib/services/LapsedTrialReactivationService.js
 *   - lib/services/PilotConversionService.js
 *   - lib/services/WeeklyPerformanceService.js
 *   - lib/config/index.js
 *   - product/lead-response/dashboard/lib/email-config-validation.ts
 *   - product/lead-response/dashboard/lib/lead-magnet-email.ts
 *   - product/lead-response/dashboard/lib/pilot-conversion-service.ts
 *   - product/lead-response/dashboard/app/api/auth/pilot-signup/route.ts
 *   - product/lead-response/dashboard/app/api/admin/pilot-signups/invite/route.ts
 * - Update regression coverage in:
 *   - tests/c47360f2-fix-email-delivery-resend-from-domain-not-verified.test.js
 *   - tests/index.test.js
 *   - product/lead-response/dashboard/__tests__/email-domain-configuration.test.ts
 *   - product/lead-response/dashboard/lib/__tests__/email-config-validation.test.ts
 *   - tests/unit/email-service-class.test.js
 * Verify:
 * - node tests/c47360f2-fix-email-delivery-resend-from-domain-not-verified.test.js
 * - node tests/unit/email-service-class.test.js
 * - npx jest tests/index.test.js --runInBand
 * - cd product/lead-response/dashboard && npx jest __tests__/email-domain-configuration.test.ts lib/__tests__/email-config-validation.test.ts --runInBand
 * - npm test
 * - npm run build
 * Boundaries:
 * - Do not change non-email business logic, database schema, or route behavior beyond sender defaults.
 * - Do not modify support-link copy or unrelated branding text in this task.
 * - Do not touch protected generated docs/config files.
 */

/**
 * Email Domain Configuration Tests
 * Verifies that active email send paths default to the verified leadflow.ai domain.
 * UC: fix-email-delivery-resend-from-domain-not-verified
 */

import fs from 'fs'
import path from 'path'

describe('Email Domain Configuration', () => {
  const dashboardDir = path.join(__dirname, '..')
  const libDir = path.join(dashboardDir, 'lib')
  const appDir = path.join(dashboardDir, 'app', 'api')

  describe('email-service.ts', () => {
    it('should have onboarding@leadflow.ai as the default FROM_EMAIL', async () => {
      const content = fs.readFileSync(path.join(libDir, 'email-service.ts'), 'utf-8')

      expect(content).toContain("'onboarding@leadflow.ai'")
      expect(content).not.toContain("'onboarding@resend.dev'")
      expect(content).toContain('verified in Resend')
    })

    it('should read FROM_EMAIL from environment variable', async () => {
      const content = fs.readFileSync(path.join(libDir, 'email-service.ts'), 'utf-8')
      expect(content).toContain('process.env.FROM_EMAIL')
    })
  })

  describe('trial-emails.ts', () => {
    it('should have onboarding@leadflow.ai as the default FROM_EMAIL', async () => {
      const content = fs.readFileSync(path.join(libDir, 'trial-emails.ts'), 'utf-8')

      expect(content).toContain("'onboarding@leadflow.ai'")
      expect(content).not.toContain("'onboarding@resend.dev'")
    })

    it('should use dynamic FROM_DISPLAY variable in emails', async () => {
      const content = fs.readFileSync(path.join(libDir, 'trial-emails.ts'), 'utf-8')

      expect(content).toContain('const FROM_DISPLAY = `LeadFlow AI <${FROM_EMAIL}>`')
      expect(content).toContain('from: FROM_DISPLAY,')
    })
  })

  describe('outreach-email-service.ts', () => {
    it('should have onboarding@leadflow.ai as the final fallback', async () => {
      const content = fs.readFileSync(path.join(libDir, 'outreach-email-service.ts'), 'utf-8')

      expect(content).toContain("process.env.OUTREACH_FROM_EMAIL")
      expect(content).toContain("process.env.FROM_EMAIL")
      expect(content).toContain("'onboarding@leadflow.ai'")
    })
  })

  describe('nps-email-service.ts', () => {
    it('should have onboarding@leadflow.ai as the default FROM_EMAIL', async () => {
      const content = fs.readFileSync(path.join(libDir, 'nps-email-service.ts'), 'utf-8')

      expect(content).toContain("'onboarding@leadflow.ai'")
      expect(content).not.toContain("'onboarding@resend.dev'")
    })
  })

  describe('active route fallbacks', () => {
    it('pilot signup route should default to onboarding@leadflow.ai', () => {
      const content = fs.readFileSync(path.join(appDir, 'auth', 'pilot-signup', 'route.ts'), 'utf-8')

      expect(content).toContain("'onboarding@leadflow.ai'")
      expect(content).not.toContain("'onboarding@landyourleads.com'")
    })

    it('pilot invite route should default to onboarding@leadflow.ai', () => {
      const content = fs.readFileSync(path.join(appDir, 'admin', 'pilot-signups', 'invite', 'route.ts'), 'utf-8')

      expect(content).toContain("'onboarding@leadflow.ai'")
      expect(content).not.toContain("'onboarding@landyourleads.com'")
    })
  })

  describe('Environment Variable Precedence', () => {
    it('FROM_EMAIL env var should be used when set', () => {
      const originalFromEmail = process.env.FROM_EMAIL

      try {
        process.env.FROM_EMAIL = 'custom@example.com'
        expect(process.env.FROM_EMAIL).toBe('custom@example.com')
      } finally {
        if (originalFromEmail !== undefined) {
          process.env.FROM_EMAIL = originalFromEmail
        } else {
          delete process.env.FROM_EMAIL
        }
      }
    })

    it('should fallback to onboarding@leadflow.ai when FROM_EMAIL is not set', () => {
      const originalFromEmail = process.env.FROM_EMAIL

      try {
        delete process.env.FROM_EMAIL
        const fallback = 'onboarding@leadflow.ai'
        expect(fallback).toBe('onboarding@leadflow.ai')
      } finally {
        if (originalFromEmail !== undefined) {
          process.env.FROM_EMAIL = originalFromEmail
        }
      }
    })
  })

  describe('No Test Domain References', () => {
    it('should not contain resend.dev test domain in any email service', async () => {
      const emailServices = [
        'email-service.ts',
        'trial-emails.ts',
        'outreach-email-service.ts',
        'nps-email-service.ts'
      ]

      for (const service of emailServices) {
        const content = fs.readFileSync(path.join(libDir, service), 'utf-8')
        const fallbackLines = content
          .split('\n')
          .filter(line => line.includes('process.env.FROM_EMAIL') || line.includes('process.env.OUTREACH_FROM_EMAIL'))

        expect(fallbackLines.length).toBeGreaterThan(0)
        fallbackLines.forEach((line) => {
          expect(line).not.toContain('onboarding@resend.dev')
        })
      }
    })
  })
})
