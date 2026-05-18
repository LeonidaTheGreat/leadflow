/**
 * Regression: admin funnel checkout-attempts route must use checkout_sessions,
 * not subscription_attempts (which does not exist in Supabase).
 */

import fs from 'fs'
import path from 'path'

const ROUTE_PATH = path.join(
  __dirname,
  '../app/api/admin/funnel/checkout-attempts/route.ts'
)

describe('Admin funnel: checkout-attempts route uses checkout_sessions', () => {
  let routeSource: string

  beforeAll(() => {
    routeSource = fs.readFileSync(ROUTE_PATH, 'utf8')
  })

  test('route does not reference subscription_attempts', () => {
    expect(routeSource).not.toContain('subscription_attempts')
  })

  test('route queries checkout_sessions table', () => {
    expect(routeSource).toContain("from('checkout_sessions')")
  })

  test('route selects user_id (not agent_id) for identity column', () => {
    expect(routeSource).toContain('user_id')
  })

  test('route counts expired and abandoned sessions as abandonment', () => {
    expect(routeSource).toContain("'expired'")
    expect(routeSource).toContain("'abandoned'")
  })
})
