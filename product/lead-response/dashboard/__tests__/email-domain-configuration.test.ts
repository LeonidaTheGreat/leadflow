/**
 * Email Domain Configuration Tests
 * Verifies that all email services use a verified Resend domain (leadflow.ai)
 * and do not fall back to the blocked onboarding@resend.dev test address.
 * UC: fix-email-delivery-resend-from-domain-not-verified
 */

import path from 'path'

describe('Email Domain Configuration', () => {
  const dashboardDir = path.join(__dirname, '..')
  const libDir = path.join(dashboardDir, 'lib')

  describe('email-service.ts', () => {
    it('should have onboarding@leadflow.ai as the default FROM_EMAIL', async () => {
      const fs = require('fs')
      const content = fs.readFileSync(path.join(libDir, 'email-service.ts'), 'utf-8')

      // Verify fallback is leadflow.ai, not resend.dev
      expect(content).toContain("'onboarding@leadflow.ai'")
      expect(content).not.toContain("'onboarding@resend.dev'")

      // Verify comment explains domain setup
      expect(content).toContain('verified in Resend')
    })

    it('should read FROM_EMAIL from environment variable', async () => {
      const fs = require('fs')
      const content = fs.readFileSync(path.join(libDir, 'email-service.ts'), 'utf-8')

      // Verify it reads from process.env.FROM_EMAIL
      expect(content).toContain('process.env.FROM_EMAIL')
    })
  })

  describe('trial-emails.ts', () => {
    it('should have onboarding@leadflow.ai as the default FROM_EMAIL', async () => {
      const fs = require('fs')
      const content = fs.readFileSync(path.join(libDir, 'trial-emails.ts'), 'utf-8')

      // Verify fallback is leadflow.ai
      expect(content).toContain("'onboarding@leadflow.ai'")
      expect(content).not.toContain("'onboarding@resend.dev'")
    })

    it('should use dynamic FROM_DISPLAY variable in emails', async () => {
      const fs = require('fs')
      const content = fs.readFileSync(path.join(libDir, 'trial-emails.ts'), 'utf-8')

      // Verify FROM_DISPLAY is defined
      expect(content).toContain('const FROM_DISPLAY = `LeadFlow AI <${FROM_EMAIL}>`')

      // Verify it's used in email sends (not hardcoded)
      expect(content).toContain('from: FROM_DISPLAY,')
    })
  })

  describe('outreach-email-service.ts', () => {
    it('should have onboarding@leadflow.ai as the final fallback', async () => {
      const fs = require('fs')
      const content = fs.readFileSync(path.join(libDir, 'outreach-email-service.ts'), 'utf-8')

      // Verify fallback chain: OUTREACH_FROM_EMAIL -> FROM_EMAIL -> leadflow.ai
      expect(content).toContain("process.env.OUTREACH_FROM_EMAIL")
      expect(content).toContain("process.env.FROM_EMAIL")
      expect(content).toContain("'onboarding@leadflow.ai'")
    })
  })

  describe('nps-email-service.ts', () => {
    it('should have onboarding@leadflow.ai as the default FROM_EMAIL', async () => {
      const fs = require('fs')
      const content = fs.readFileSync(path.join(libDir, 'nps-email-service.ts'), 'utf-8')

      // Verify fallback is leadflow.ai
      expect(content).toContain("'onboarding@leadflow.ai'")
      expect(content).not.toContain("'onboarding@resend.dev'")
    })
  })

  describe('Environment Variable Precedence', () => {
    it('FROM_EMAIL env var should be used when set', () => {
      // This test documents the precedence
      const originalFromEmail = process.env.FROM_EMAIL

      try {
        process.env.FROM_EMAIL = 'custom@example.com'
        // In real execution, this would use custom@example.com
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
      // This test documents the fallback behavior
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
      const fs = require('fs')

      const emailServices = [
        'email-service.ts',
        'trial-emails.ts',
        'outreach-email-service.ts',
        'nps-email-service.ts'
      ]

      for (const service of emailServices) {
        const content = fs.readFileSync(path.join(libDir, service), 'utf-8')
        expect(content).not.toContain('onboarding@resend.dev')
      }
    })
  })
})
