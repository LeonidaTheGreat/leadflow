import { getPilotStatus, isPilotExpired, PilotStatus } from '../lib/pilot-status'

describe('getPilotStatus', () => {
  const now = new Date()

  it('returns not_pilot for non-pilot agents', () => {
    const result = getPilotStatus({ plan_tier: 'pro' })
    expect(result.status).toBe('not_pilot')
    expect(result.daysRemaining).toBeNull()
  })

  it('returns active for pilot with 60 days remaining', () => {
    const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
    const startedAt = now.toISOString()
    const result = getPilotStatus({
      plan_tier: 'pilot',
      pilot_started_at: startedAt,
      pilot_expires_at: expiresAt,
    })
    expect(result.status).toBe('active')
    expect(result.daysRemaining).toBeGreaterThan(55)
  })

  it('returns expiring_soon when <= 15 days left', () => {
    const expiresAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const result = getPilotStatus({
      plan_tier: 'pilot',
      pilot_started_at: now.toISOString(),
      pilot_expires_at: expiresAt,
    })
    expect(result.status).toBe('expiring_soon')
    expect(result.daysRemaining).toBeLessThanOrEqual(15)
    expect(result.daysRemaining).toBeGreaterThan(0)
  })

  it('returns expired when past expiry date', () => {
    const expiresAt = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const result = getPilotStatus({
      plan_tier: 'pilot',
      pilot_started_at: now.toISOString(),
      pilot_expires_at: expiresAt,
    })
    expect(result.status).toBe('expired')
    expect(result.daysRemaining).toBe(0)
  })

  it('returns converted for pilot with stripe_customer_id', () => {
    const result = getPilotStatus({
      plan_tier: 'pilot',
      pilot_started_at: now.toISOString(),
      pilot_expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      stripe_customer_id: 'cus_test123',
    })
    expect(result.status).toBe('converted')
  })

  it('handles missing pilot_expires_at gracefully', () => {
    const result = getPilotStatus({
      plan_tier: 'pilot',
      pilot_started_at: now.toISOString(),
      pilot_expires_at: null,
    })
    expect(result.status).toBe('active')
    expect(result.daysRemaining).toBeNull()
  })

  it('handles null plan_tier', () => {
    const result = getPilotStatus({ plan_tier: null })
    expect(result.status).toBe('not_pilot')
  })
})

describe('isPilotExpired', () => {
  const now = new Date()

  it('returns false for non-pilot agents', () => {
    expect(isPilotExpired({ plan_tier: 'pro' })).toBe(false)
  })

  it('returns false for active pilot', () => {
    expect(isPilotExpired({
      plan_tier: 'pilot',
      pilot_expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })).toBe(false)
  })

  it('returns true for expired pilot', () => {
    expect(isPilotExpired({
      plan_tier: 'pilot',
      pilot_expires_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    })).toBe(true)
  })

  it('returns false for expired pilot that has been converted', () => {
    expect(isPilotExpired({
      plan_tier: 'pilot',
      pilot_expires_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      stripe_customer_id: 'cus_converted',
    })).toBe(false)
  })

  it('returns false when pilot_expires_at is null', () => {
    expect(isPilotExpired({
      plan_tier: 'pilot',
      pilot_expires_at: null,
    })).toBe(false)
  })
})
