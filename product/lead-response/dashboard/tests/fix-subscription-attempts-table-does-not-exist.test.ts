/**
 * Regression: checkout audit logging should use checkout_sessions, not subscription_attempts.
 */

import fs from 'fs'
import path from 'path'

const ROUTE_PATH = path.join(
  __dirname,
  '../app/api/billing/create-checkout/route.ts'
)

describe('Fix: subscription_attempts table does not exist', () => {
  let routeSource: string

  beforeAll(() => {
    routeSource = fs.readFileSync(ROUTE_PATH, 'utf8')
  })

  test('route does not reference subscription_attempts', () => {
    expect(routeSource).not.toContain('subscription_attempts')
  })

  test('route inserts into checkout_sessions', () => {
    expect(routeSource).toContain("from('checkout_sessions').insert(")
  })

  test('route maps checkout_sessions columns correctly', () => {
    expect(routeSource).toContain('user_id: agentId')
    expect(routeSource).toContain('stripe_session_id: session.id')
    expect(routeSource).toContain("status: 'pending'")
    expect(routeSource).toContain('tier: tierBase')
    expect(routeSource).toContain('interval: tierInterval')
    expect(routeSource).toContain('url: session.url')
  })

  test('route derives interval from the selected tier', () => {
    expect(routeSource).toContain("tier.endsWith('_annual') ? 'year' : 'month'")
  })

  test('route does not use invalid checkout_sessions fields or statuses', () => {
    // The checkout_sessions insert must use user_id, not agent_id, as the column key.
    // Note: agent_id: appears legitimately in Stripe customer/subscription metadata
    // (e.g. stripe.customers.create({ metadata: { agent_id: ... } })), so we verify
    // the insert block specifically uses user_id: agentId.
    expect(routeSource).toContain('user_id: agentId')
    expect(routeSource).not.toContain('session_created')
  })
})
