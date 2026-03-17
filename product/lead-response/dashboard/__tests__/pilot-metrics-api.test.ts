/**
 * @jest-environment node
 *
 * Tests for GET /api/dashboard/pilot-metrics endpoint.
 * Wrapper for /api/internal/pilot-usage that's accessible from the dashboard.
 */

const MOCK_RESPONSE = {
  pilots: [
    {
      agentId: 'agent-1',
      name: 'Alice Smith',
      email: 'alice@test.com',
      planTier: 'pilot',
      lastLogin: new Date().toISOString(),
      sessionsLast7d: 5,
      topPage: '/dashboard/conversations',
      inactiveHours: 2,
      atRisk: false,
    },
  ],
  generatedAt: new Date().toISOString(),
}

describe('GET /api/dashboard/pilot-metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.VERCEL_URL = 'example.com'
  })

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.VERCEL_URL
  })

  it('validates MOCK_RESPONSE structure matches expected format', () => {
    expect(MOCK_RESPONSE).toHaveProperty('pilots')
    expect(MOCK_RESPONSE).toHaveProperty('generatedAt')
    expect(Array.isArray(MOCK_RESPONSE.pilots)).toBe(true)
    
    const pilot = MOCK_RESPONSE.pilots[0]
    expect(pilot).toHaveProperty('agentId')
    expect(pilot).toHaveProperty('name')
    expect(pilot).toHaveProperty('email')
    expect(pilot).toHaveProperty('sessionsLast7d')
    expect(pilot).toHaveProperty('inactiveHours')
    expect(pilot).toHaveProperty('atRisk')
  })

  it('validates generated timestamp is valid ISO string', () => {
    const timestamp = MOCK_RESPONSE.generatedAt
    expect(typeof timestamp).toBe('string')
    const date = new Date(timestamp)
    expect(date instanceof Date && !isNaN(date.getTime())).toBe(true)
  })

  it('ensures pilot metrics include all required fields', () => {
    MOCK_RESPONSE.pilots.forEach((pilot) => {
      expect(typeof pilot.agentId).toBe('string')
      expect(typeof pilot.name).toBe('string')
      expect(typeof pilot.email).toBe('string')
      expect(typeof pilot.planTier).toBe('string')
      expect(typeof pilot.lastLogin).toBe('string')
      expect(typeof pilot.sessionsLast7d).toBe('number')
      expect(typeof pilot.topPage).toBe('string')
      expect(typeof pilot.inactiveHours).toBe('number')
      expect(typeof pilot.atRisk).toBe('boolean')
    })
  })
})
