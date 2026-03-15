/**
 * Test: Fix — subscription_attempts table does not exist
 *
 * Verifies that the create-checkout route uses checkout_sessions (not subscription_attempts)
 * with correct column mapping and valid status values.
 *
 * Task: 8ed759a3-c0e1-4e27-b16f-1b8d9c05a90c
 */

const fs = require('fs')
const path = require('path')

const ROUTE_PATH = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/billing/create-checkout/route.ts'
)

describe('Fix: subscription_attempts table does not exist', () => {
  let routeSource

  beforeAll(() => {
    routeSource = fs.readFileSync(ROUTE_PATH, 'utf8')
  })

  test('route does NOT reference subscription_attempts', () => {
    expect(routeSource).not.toContain('subscription_attempts')
  })

  test('route inserts into checkout_sessions', () => {
    expect(routeSource).toContain("from('checkout_sessions').insert(")
  })

  test('insert uses user_id (not agent_id) column', () => {
    const insertBlock = routeSource.match(/checkout_sessions'[^)]+\.insert\(\{[^}]+\}/s)?.[0] || ''
    expect(routeSource).toContain('user_id: agentId')
    expect(routeSource).not.toMatch(/checkout_sessions[\s\S]*?agent_id:/)
  })

  test('insert uses valid status value "pending"', () => {
    expect(routeSource).toContain("status: 'pending'")
  })

  test('insert does NOT use invalid status "session_created"', () => {
    expect(routeSource).not.toContain("session_created")
  })

  test('insert includes stripe_session_id', () => {
    expect(routeSource).toContain('stripe_session_id: session.id')
  })

  test('insert includes tier (base tier without interval suffix)', () => {
    expect(routeSource).toContain("tier: tierBase")
  })

  test('insert includes interval derived from tier string', () => {
    expect(routeSource).toContain("interval: tierInterval")
    expect(routeSource).toContain("tier.endsWith('_annual') ? 'year' : 'month'")
  })

  test('insert includes url from session', () => {
    expect(routeSource).toContain('url: session.url')
  })
})
