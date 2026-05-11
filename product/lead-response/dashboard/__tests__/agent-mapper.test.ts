import { realEstateAgentRowToAgent, RealEstateAgentRow } from '@/lib/agent-mapper'

const baseRow: RealEstateAgentRow = {
  id: 'agent-1',
  email: 'jane@example.com',
  first_name: 'Jane',
  last_name: 'Smith',
  phone_number: '+15551234567',
  state: 'CA',
  status: 'active',
  timezone: 'America/Los_Angeles',
  satisfaction_ping_enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

describe('realEstateAgentRowToAgent', () => {
  it('builds name from first_name and last_name', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    expect(agent.name).toBe('Jane Smith')
  })

  it('falls back to email when both name parts are empty', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, first_name: '', last_name: '' })
    expect(agent.name).toBe('jane@example.com')
  })

  it('maps phone_number to phone', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    expect(agent.phone).toBe('+15551234567')
  })

  it('returns null phone when phone_number is null', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, phone_number: null })
    expect(agent.phone).toBeNull()
  })

  it('derives is_active=true from status=active', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    expect(agent.is_active).toBe(true)
  })

  it('derives is_active=false from status=inactive', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, status: 'inactive' })
    expect(agent.is_active).toBe(false)
  })

  it('detects CA province and returns ca-ontario market', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, state: 'ON' })
    expect(agent.market).toBe('ca-ontario')
  })

  it('returns us-national market for US states', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, state: 'TX' })
    expect(agent.market).toBe('us-national')
  })

  it('returns us-national market when state is null', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, state: null })
    expect(agent.market).toBe('us-national')
  })

  it('provides DEFAULT_AGENT_SETTINGS so hasRequiredAgent check passes', () => {
    const agent = realEstateAgentRowToAgent(baseRow)
    const hasRequiredAgent = agent && agent.market && agent.settings
    expect(hasRequiredAgent).toBeTruthy()
  })

  it('defaults timezone to America/New_York when null', () => {
    const agent = realEstateAgentRowToAgent({ ...baseRow, timezone: null })
    expect(agent.timezone).toBe('America/New_York')
  })
})
