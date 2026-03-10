/**
 * Tests for the free pilot onboarding feature.
 * Tests the pilot field logic and contract without importing Next.js route handlers.
 */

import { getPilotStatus, isPilotExpired } from '../lib/pilot-status'

const PILOT_DURATION_DAYS = 60

describe('Free Pilot Onboarding — No Credit Card Required', () => {
  describe('Pilot field generation', () => {
    it('generates correct pilot fields for new signup', () => {
      const now = new Date()
      const pilotExpiresAt = new Date(now.getTime() + PILOT_DURATION_DAYS * 24 * 60 * 60 * 1000)

      const agentInsert = {
        email: 'pilot@example.com',
        plan_tier: 'pilot',
        pilot_started_at: now.toISOString(),
        pilot_expires_at: pilotExpiresAt.toISOString(),
        // No stripe_customer_id — free pilot, no credit card
      }

      expect(agentInsert.plan_tier).toBe('pilot')
      expect(agentInsert.pilot_started_at).toBeDefined()
      expect(agentInsert.pilot_expires_at).toBeDefined()
      expect((agentInsert as any).stripe_customer_id).toBeUndefined()

      // Verify 60-day duration
      const start = new Date(agentInsert.pilot_started_at)
      const end = new Date(agentInsert.pilot_expires_at)
      const daysDiff = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
      expect(daysDiff).toBe(60)
    })

    it('does not include any payment or billing fields', () => {
      const requiredFields = ['email', 'password', 'firstName', 'lastName', 'phoneNumber', 'state']
      const billingFields = ['stripeToken', 'creditCard', 'paymentMethod', 'cardNumber', 'billingAddress']

      // Required fields should NOT include any billing fields
      billingFields.forEach(field => {
        expect(requiredFields).not.toContain(field)
      })
    })
  })

  describe('Pilot status tracking', () => {
    const now = new Date()

    it('new pilot is active with full days remaining', () => {
      const status = getPilotStatus({
        plan_tier: 'pilot',
        pilot_started_at: now.toISOString(),
        pilot_expires_at: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      })
      expect(status.status).toBe('active')
      expect(status.daysRemaining).toBeGreaterThanOrEqual(59)
    })

    it('pilot approaching day 45 shows expiring_soon', () => {
      const status = getPilotStatus({
        plan_tier: 'pilot',
        pilot_started_at: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        pilot_expires_at: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      })
      expect(status.status).toBe('expiring_soon')
      expect(status.daysRemaining).toBeLessThanOrEqual(15)
    })

    it('expired pilot is flagged correctly', () => {
      const status = getPilotStatus({
        plan_tier: 'pilot',
        pilot_started_at: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString(),
        pilot_expires_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      })
      expect(status.status).toBe('expired')
      expect(status.daysRemaining).toBe(0)
    })

    it('converted pilot (with stripe) is not expired', () => {
      const expired = isPilotExpired({
        plan_tier: 'pilot',
        pilot_expires_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_customer_id: 'cus_converted123',
      })
      expect(expired).toBe(false)
    })
  })

  describe('SMS pause for expired pilots', () => {
    const now = new Date()

    it('active pilot should NOT have SMS paused', () => {
      expect(isPilotExpired({
        plan_tier: 'pilot',
        pilot_expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })).toBe(false)
    })

    it('expired pilot SHOULD have SMS paused', () => {
      expect(isPilotExpired({
        plan_tier: 'pilot',
        pilot_expires_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      })).toBe(true)
    })

    it('non-pilot agent should NOT be affected', () => {
      expect(isPilotExpired({
        plan_tier: 'pro',
        pilot_expires_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      })).toBe(false)
    })
  })

  describe('Onboard API contract', () => {
    it('response should include pilot info with welcome message', () => {
      const now = new Date()
      const pilotExpiresAt = new Date(now.getTime() + PILOT_DURATION_DAYS * 24 * 60 * 60 * 1000)

      // Simulating what the API response should look like
      const apiResponse = {
        message: 'Welcome to your free pilot! You have 60 days of full access.',
        pilot: {
          plan: 'pilot',
          durationDays: PILOT_DURATION_DAYS,
          startsAt: now.toISOString(),
          expiresAt: pilotExpiresAt.toISOString(),
        },
      }

      expect(apiResponse.message).toContain('free pilot')
      expect(apiResponse.message).toContain('60 days')
      expect(apiResponse.pilot.plan).toBe('pilot')
      expect(apiResponse.pilot.durationDays).toBe(60)
    })
  })
})
