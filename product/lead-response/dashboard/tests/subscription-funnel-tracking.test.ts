/**
 * Subscription Funnel Tracking — Route Tests
 *
 * Verifies that:
 * 1. upgrade-checkout inserts into subscription_attempts with session_created status
 * 2. stripe webhook handles checkout.session.expired and sends abandonment recovery email
 * 3. admin funnel endpoint reads from subscription_attempts with correct status values
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
const WEBHOOK_ROUTE = path.join(
  __dirname,
  '../app/api/webhooks/stripe/route.ts'
)

describe('Subscription Funnel Tracking', () => {
  let upgradeCheckoutSource: string
  let checkoutAttemptsSource: string
  let webhookSource: string

  beforeAll(() => {
    upgradeCheckoutSource = fs.readFileSync(UPGRADE_CHECKOUT_ROUTE, 'utf8')
    checkoutAttemptsSource = fs.readFileSync(CHECKOUT_ATTEMPTS_ROUTE, 'utf8')
    webhookSource = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  })

  describe('upgrade-checkout: session_created insert', () => {
    test('route inserts into subscription_attempts on checkout creation', () => {
      expect(upgradeCheckoutSource).toContain("from('subscription_attempts').insert(")
    })

    test('insert uses agent_id column', () => {
      expect(upgradeCheckoutSource).toContain('agent_id: agent.id')
    })

    test('insert uses status "session_created"', () => {
      expect(upgradeCheckoutSource).toContain("status: 'session_created'")
    })

    test('insert includes stripe_session_id', () => {
      expect(upgradeCheckoutSource).toContain('stripe_session_id: session.id')
    })

    test('insert includes tier', () => {
      expect(upgradeCheckoutSource).toContain('tier:')
    })
  })

  describe('stripe webhook: handles checkout.session.expired', () => {
    test('webhook handles checkout.session.expired case', () => {
      expect(webhookSource).toContain("case 'checkout.session.expired'")
    })

    test('webhook updates subscription_attempts status to session_expired', () => {
      expect(webhookSource).toContain("from('subscription_attempts')")
      expect(webhookSource).toContain("status: 'session_expired'")
    })

    test('webhook checks plan_tier !== trial before sending email', () => {
      expect(webhookSource).toContain("plan_tier !== 'trial'")
    })

    test('webhook sends abandonment recovery email with correct subject', () => {
      expect(webhookSource).toContain("subject: 'Your LeadFlow upgrade is waiting'")
    })

    test('webhook sends email from LeadFlow AI support address', () => {
      expect(webhookSource).toContain("from: 'LeadFlow AI <support@leadflowai.com>'")
    })

    test('webhook links to settings/billing in recovery email', () => {
      expect(webhookSource).toContain('settings/billing')
    })

    test('webhook logs checkout_abandoned event to subscription_events', () => {
      expect(webhookSource).toContain("event_type: 'checkout_abandoned'")
    })

    test('webhook handles agent not found case', () => {
      expect(webhookSource).toContain('agent not found')
    })
  })

  describe('admin endpoint: GET /api/admin/funnel/checkout-attempts', () => {
    test('endpoint file exists', () => {
      expect(fs.existsSync(CHECKOUT_ATTEMPTS_ROUTE)).toBe(true)
    })

    test('endpoint queries subscription_attempts table', () => {
      expect(checkoutAttemptsSource).toContain("from('subscription_attempts')")
    })

    test('endpoint does NOT reference checkout_sessions', () => {
      expect(checkoutAttemptsSource).not.toContain("from('checkout_sessions')")
    })

    test('endpoint requires admin auth via LEADFLOW_API_KEY', () => {
      expect(checkoutAttemptsSource).toContain('LEADFLOW_API_KEY')
      expect(checkoutAttemptsSource).toContain('verifyAdminAuth')
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
