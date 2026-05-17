/**
 * Subscription Funnel Tracking — Route Tests
 *
 * Verifies that:
 * 1. upgrade-checkout uses checkout_sessions (not the non-existent subscription_attempts)
 * 2. admin funnel endpoint reads from checkout_sessions with correct status values
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

describe('Subscription Funnel Tracking', () => {
  let upgradeCheckoutSource: string
  let checkoutAttemptsSource: string

  beforeAll(() => {
    upgradeCheckoutSource = fs.readFileSync(UPGRADE_CHECKOUT_ROUTE, 'utf8')
    checkoutAttemptsSource = fs.readFileSync(CHECKOUT_ATTEMPTS_ROUTE, 'utf8')
  })

  describe('upgrade-checkout: uses checkout_sessions (not subscription_attempts)', () => {
    test('route does NOT reference subscription_attempts', () => {
      expect(upgradeCheckoutSource).not.toContain('subscription_attempts')
    })

    test('route inserts into checkout_sessions', () => {
      expect(upgradeCheckoutSource).toContain("from('checkout_sessions').insert(")
    })

    test('insert uses user_id column (not agent_id)', () => {
      expect(upgradeCheckoutSource).toContain('user_id: agent.id')
    })

    test('insert uses valid status "pending"', () => {
      expect(upgradeCheckoutSource).toContain("status: 'pending'")
    })

    test('insert does NOT use invalid status "session_created"', () => {
      expect(upgradeCheckoutSource).not.toContain("'session_created'")
    })

    test('insert includes stripe_session_id', () => {
      expect(upgradeCheckoutSource).toContain('stripe_session_id: session.id')
    })

    test('insert includes tier', () => {
      expect(upgradeCheckoutSource).toContain('tier:')
    })

    test('insert includes interval', () => {
      expect(upgradeCheckoutSource).toContain('interval:')
    })

    test('insert includes url from session', () => {
      expect(upgradeCheckoutSource).toContain('url: session.url')
    })
  })

  describe('admin endpoint: GET /api/admin/funnel/checkout-attempts', () => {
    test('endpoint file exists', () => {
      expect(fs.existsSync(CHECKOUT_ATTEMPTS_ROUTE)).toBe(true)
    })

    test('endpoint does NOT reference subscription_attempts', () => {
      expect(checkoutAttemptsSource).not.toContain("from('subscription_attempts')")
    })

    test('endpoint queries checkout_sessions table', () => {
      expect(checkoutAttemptsSource).toContain("from('checkout_sessions')")
    })

    test('endpoint requires admin auth via LEADFLOW_API_KEY', () => {
      expect(checkoutAttemptsSource).toContain('LEADFLOW_API_KEY')
      expect(checkoutAttemptsSource).toContain('verifyAdminAuth')
    })

    test('endpoint uses correct status values for checkout_sessions', () => {
      expect(checkoutAttemptsSource).toContain("status === 'expired'")
      expect(checkoutAttemptsSource).toContain("status === 'completed'")
      expect(checkoutAttemptsSource).not.toContain("'session_expired'")
    })

    test('endpoint returns daily breakdown with rates', () => {
      expect(checkoutAttemptsSource).toContain('completion_rate')
      expect(checkoutAttemptsSource).toContain('abandonment_rate')
      expect(checkoutAttemptsSource).toContain('initiated')
      expect(checkoutAttemptsSource).toContain('abandoned')
    })

    test('endpoint returns summary totals', () => {
      expect(checkoutAttemptsSource).toContain('total_initiated')
      expect(checkoutAttemptsSource).toContain('total_completed')
      expect(checkoutAttemptsSource).toContain('total_abandoned')
    })

    test('endpoint supports configurable days parameter', () => {
      expect(checkoutAttemptsSource).toContain("searchParams.get('days')")
    })
  })
})
