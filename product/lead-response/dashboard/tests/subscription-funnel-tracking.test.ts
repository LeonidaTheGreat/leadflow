/**
 * Checkout Funnel Tracking — Source Verification Tests
 *
 * Verifies that:
 * 1. upgrade-checkout route uses checkout_sessions (NOT subscription_attempts)
 * 2. admin funnel endpoint uses checkout_sessions (NOT subscription_attempts)
 */

import fs from 'fs'
import path from 'path'

const UPGRADE_CHECKOUT_ROUTE = path.join(
  __dirname,
  '../app/api/stripe/upgrade-checkout/route.ts'
)
const CHECKOUT_ATTEMPTS_ROUTE = path.join(
  __dirname,
  '../app/api/admin/funnel/checkout-attempts/route.ts'
)

describe('Checkout Funnel Tracking', () => {
  let upgradeCheckoutSource: string
  let checkoutAttemptsSource: string

  beforeAll(() => {
    upgradeCheckoutSource = fs.readFileSync(UPGRADE_CHECKOUT_ROUTE, 'utf8')
    checkoutAttemptsSource = fs.readFileSync(CHECKOUT_ATTEMPTS_ROUTE, 'utf8')
  })

  describe('upgrade-checkout route: uses checkout_sessions', () => {
    test('route does NOT reference subscription_attempts', () => {
      expect(upgradeCheckoutSource).not.toContain('subscription_attempts')
    })

    test('route inserts into checkout_sessions on checkout creation', () => {
      expect(upgradeCheckoutSource).toContain("from('checkout_sessions').insert(")
    })

    test('insert uses user_id: agent.id', () => {
      expect(upgradeCheckoutSource).toContain('user_id: agent.id')
    })

    test('insert uses status: pending', () => {
      expect(upgradeCheckoutSource).toContain("status: 'pending'")
    })

    test('insert includes stripe_session_id: session.id', () => {
      expect(upgradeCheckoutSource).toContain('stripe_session_id: session.id')
    })

    test('insert includes tier field', () => {
      expect(upgradeCheckoutSource).toContain('tier:')
    })

    test('insert includes interval field', () => {
      expect(upgradeCheckoutSource).toContain('interval:')
    })

    test('insert includes url: session.url', () => {
      expect(upgradeCheckoutSource).toContain('url: session.url')
    })
  })

  describe('admin endpoint: GET /api/admin/funnel/checkout-attempts', () => {
    test('endpoint file exists', () => {
      expect(fs.existsSync(CHECKOUT_ATTEMPTS_ROUTE)).toBe(true)
    })

    test('endpoint does NOT reference subscription_attempts', () => {
      expect(checkoutAttemptsSource).not.toContain('subscription_attempts')
    })

    test('endpoint queries checkout_sessions table', () => {
      expect(checkoutAttemptsSource).toContain("from('checkout_sessions')")
    })

    test('endpoint requires admin auth via LEADFLOW_API_KEY', () => {
      expect(checkoutAttemptsSource).toContain('LEADFLOW_API_KEY')
      expect(checkoutAttemptsSource).toContain('verifyAdminAuth')
    })

    test('endpoint uses expired/abandoned status values (not session_expired)', () => {
      expect(checkoutAttemptsSource).toContain("'expired'")
      expect(checkoutAttemptsSource).toContain("'abandoned'")
      expect(checkoutAttemptsSource).not.toContain("'session_expired'")
    })

    test('endpoint returns completion_rate', () => {
      expect(checkoutAttemptsSource).toContain('completion_rate')
    })

    test('endpoint returns abandonment_rate', () => {
      expect(checkoutAttemptsSource).toContain('abandonment_rate')
    })

    test('endpoint returns total_initiated', () => {
      expect(checkoutAttemptsSource).toContain('total_initiated')
    })

    test('endpoint returns total_completed', () => {
      expect(checkoutAttemptsSource).toContain('total_completed')
    })

    test('endpoint returns total_abandoned', () => {
      expect(checkoutAttemptsSource).toContain('total_abandoned')
    })

    test('endpoint supports configurable days parameter', () => {
      expect(checkoutAttemptsSource).toContain("searchParams.get('days')")
    })
  })
})
