import { realEstateAgentRowToAgent, type RealEstateAgentRow } from '@/lib/agent-mapper'

const baseRow: RealEstateAgentRow = {
  id: 'uuid-abc123',
  email: 'agent@example.com',
  first_name: 'Jane',
  last_name: 'Smith',
  phone_number: '+15551234567',
  state: 'TX',
  status: 'active',
  timezone: 'America/Chicago',
  satisfaction_ping_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
}

describe('realEstateAgentRowToAgent', () => {
  it('maps first_name + last_name to name', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    expect(agent.name).toBe('Jane Smith')
  })

  it('maps phone_number to phone', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    expect(agent.phone).toBe('+15551234567')
  })

  it('derives is_active from status === active', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    expect(agent.is_active).toBe(true)
  })

  it('is_active false when status is not active', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, status: 'onboarding' })
    expect(agent.is_active).toBe(false)
  })

  it('defaults market to us-national for US states', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    expect(agent.market).toBe('us-national')
  })

  it('sets market to ca-ontario for Canadian provinces', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, state: 'ON' })
    expect(agent.market).toBe('ca-ontario')
  })

  it('provides default settings with auto_respond true', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    expect(agent.settings).toBeTruthy()
    expect(agent.settings.auto_respond).toBe(true)
  })

  it('produces hasRequiredAgent truthy (market + settings present)', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    // Mirrors the check in app/api/webhook/twilio/route.ts
    const hasRequiredAgent = agent && agent.market && agent.settings
    expect(hasRequiredAgent).toBeTruthy()
  })

  it('falls back to email when both name parts are empty', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, first_name: '', last_name: '' })
    expect(agent.name).toBe('agent@example.com')
  })

  it('defaults timezone to America/New_York when null', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, timezone: null })
    expect(agent.timezone).toBe('America/New_York')
  })
})
