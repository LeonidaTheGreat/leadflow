/**
 * Subscription Funnel Tracking — Webhook Handler Tests
 *
 * Tests:
 * 1. session_created insert (via upgrade-checkout route)
 * 2. session_expired update (via checkout.session.expired webhook)
 * 3. Abandonment recovery email sent for non-paying agents
 * 4. Abandonment recovery email skipped for already-paid agents
 */

import fs from 'fs'
import path from 'path'

const WEBHOOK_ROUTE = path.join(
  __dirname,
  '../app/api/webhooks/stripe/route.ts'
)
const UPGRADE_CHECKOUT_ROUTE = path.join(
  __dirname,
  '../app/api/stripe/upgrade-checkout/route.ts'
)
const CHECKOUT_ATTEMPTS_ROUTE = path.join(
  __dirname,
  '../app/api/admin/funnel/checkout-attempts/route.ts'
)

describe.skip('Subscription Funnel Tracking', () => {
  let webhookSource: string
  let upgradeCheckoutSource: string
  let checkoutAttemptsSource: string

  beforeAll(() => {
    webhookSource = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
    upgradeCheckoutSource = fs.readFileSync(UPGRADE_CHECKOUT_ROUTE, 'utf8')
    checkoutAttemptsSource = fs.readFileSync(CHECKOUT_ATTEMPTS_ROUTE, 'utf8')
  })

  describe('upgrade-checkout: session_created insert', () => {
    test('route inserts into subscription_attempts on checkout creation', () => {
      expect(upgradeCheckoutSource).toContain("from('subscription_attempts').insert(")
    })

    test('insert includes required fields: agent_id, tier, stripe_session_id, status', () => {
      expect(upgradeCheckoutSource).toContain('agent_id:')
      expect(upgradeCheckoutSource).toContain('tier:')
      expect(upgradeCheckoutSource).toContain('stripe_session_id:')
      expect(upgradeCheckoutSource).toContain("status: 'session_created'")
    })
  })

  describe('webhook: checkout.session.expired handler', () => {
    test('webhook route handles checkout.session.expired event', () => {
      expect(webhookSource).toContain("case 'checkout.session.expired'")
    })

    test('handler updates subscription_attempts status to session_expired', () => {
      expect(webhookSource).toContain("from('subscription_attempts')")
      expect(webhookSource).toContain(".update({ status: 'session_expired' })")
      expect(webhookSource).toContain(".eq('stripe_session_id',")
    })

    test('handler checks if agent already has a paid plan before sending email', () => {
      expect(webhookSource).toContain("from('real_estate_agents')")
      expect(webhookSource).toContain('plan_tier')
      expect(webhookSource).toMatch(/plan_tier.*!==.*'trial'/)
    })

    test('handler sends abandonment recovery email via Resend', () => {
      expect(webhookSource).toContain("subject: 'Your LeadFlow upgrade is waiting'")
      expect(webhookSource).toContain('resend.emails.send')
      expect(webhookSource).toContain('LeadFlow AI <support@leadflowai.com>')
    })

    test('recovery email links to /settings/billing', () => {
      expect(webhookSource).toContain('settings/billing')
    })

    test('handler logs checkout_abandoned event to subscription_events', () => {
      expect(webhookSource).toContain("event_type: 'checkout_abandoned'")
      expect(webhookSource).toContain("from('subscription_events').insert(")
    })

    test('handler skips email when agent not found', () => {
      expect(webhookSource).toContain('agent not found')
    })
  })

  describe('admin endpoint: GET /api/admin/funnel/checkout-attempts', () => {
    test('endpoint file exists', () => {
      expect(fs.existsSync(CHECKOUT_ATTEMPTS_ROUTE)).toBe(true)
    })

    test('endpoint requires admin auth via LEADFLOW_API_KEY', () => {
      expect(checkoutAttemptsSource).toContain('LEADFLOW_API_KEY')
      expect(checkoutAttemptsSource).toContain('verifyAdminAuth')
    })

    test('endpoint queries subscription_attempts table', () => {
      expect(checkoutAttemptsSource).toContain("from('subscription_attempts')")
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
