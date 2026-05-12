/**
 * @jest-environment node
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockSupabaseFrom = jest.fn()
const mockCreateLead = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockSupabaseFrom(...args) },
  createLead: (...args: unknown[]) => mockCreateLead(...args),
}))

const mockGenerateAgentResponse = jest.fn()
const mockCheckOptOut = jest.fn(() => false)
const mockExtractInfo = jest.fn(() => ({}))

jest.mock('@/agents/sms-agent/agent', () => ({
  generateAgentResponse: (...args: unknown[]) => mockGenerateAgentResponse(...args),
  checkOptOut: (...args: unknown[]) => mockCheckOptOut(...args),
  extractInfo: (...args: unknown[]) => mockExtractInfo(...args),
}))

const mockNormalizePhone = jest.fn((p: string) => p)
const mockSendSms = jest.fn()

jest.mock('@/lib/twilio', () => ({
  normalizePhone: (p: string) => mockNormalizePhone(p),
  sendSms: (...args: unknown[]) => mockSendSms(...args),
}))

const mockSearchLeadByPhone = jest.fn()
const mockCreateLeadInFub = jest.fn()

jest.mock('@/lib/fub', () => ({
  searchLeadByPhone: (...args: unknown[]) => mockSearchLeadByPhone(...args),
  createLeadInFub: (...args: unknown[]) => mockCreateLeadInFub(...args),
}))

const mockGetPendingSatisfactionPing = jest.fn()
const mockClassifyReply = jest.fn()
const mockRecordSatisfactionReply = jest.fn()
const mockSendSatisfactionPing = jest.fn()

jest.mock('@/lib/satisfaction', () => ({
  classifyReply: (...args: unknown[]) => mockClassifyReply(...args),
  getPendingSatisfactionPing: (...args: unknown[]) => mockGetPendingSatisfactionPing(...args),
  recordSatisfactionReply: (...args: unknown[]) => mockRecordSatisfactionReply(...args),
  sendSatisfactionPing: (...args: unknown[]) => mockSendSatisfactionPing(...args),
}))

import {
  isOptOutMessage,
  isOptInMessage,
  handleOptOut,
  handleOptIn,
  handleSatisfactionReply,
  findOrCreateLeadByPhone,
  getDefaultAgent,
} from '../../lib/services/inbound-sms-service'
import type { Lead } from '../../lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    phone: '+12025551234',
    name: 'Test Lead',
    email: null,
    fub_id: null,
    agent_id: 'agent-1',
    agent: null,
    status: 'new',
    source: 'sms',
    consent_sms: true,
    consent_email: false,
    dnc: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as unknown as Lead
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('isOptOutMessage', () => {
  it('returns true for canonical opt-out keywords', () => {
    expect(isOptOutMessage('stop')).toBe(true)
    expect(isOptOutMessage('STOP')).toBe(true)
    expect(isOptOutMessage('unsubscribe')).toBe(true)
    expect(isOptOutMessage('cancel')).toBe(true)
  })

  it('returns false for regular messages', () => {
    expect(isOptOutMessage('Hello!')).toBe(false)
    expect(isOptOutMessage('I want to buy a house')).toBe(false)
  })
})

describe('isOptInMessage', () => {
  it('returns true for opt-in keywords', () => {
    expect(isOptInMessage('start')).toBe(true)
    expect(isOptInMessage('START')).toBe(true)
    expect(isOptInMessage('yes')).toBe(true)
  })

  it('returns false for unrelated messages', () => {
    expect(isOptInMessage('no thanks')).toBe(false)
    expect(isOptInMessage('stop')).toBe(false)
  })
})

describe('handleOptOut', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates lead dnc=true and inserts opt_out event', async () => {
    const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const mockInsert = jest.fn().mockResolvedValue({ error: null })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'leads') return { update: mockUpdate }
      if (table === 'events') return { insert: mockInsert }
      return {}
    })

    const lead = makeLead()
    await handleOptOut(lead)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ dnc: true, consent_sms: false })
    )
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: 'lead-1', event_type: 'opt_out' })
    )
  })
})

describe('handleOptIn', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates lead consent_sms=true and dnc=false', async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })

    mockSupabaseFrom.mockImplementation(() => ({ update: mockUpdate }))

    const lead = makeLead({ dnc: true, consent_sms: false })
    await handleOptIn(lead)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ consent_sms: true, dnc: false })
    )
  })
})

describe('handleSatisfactionReply', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns false when no pending ping exists', async () => {
    mockGetPendingSatisfactionPing.mockResolvedValue(null)

    const result = await handleSatisfactionReply(makeLead(), 'Yes!')
    expect(result).toBe(false)
  })

  it('records a positive satisfaction reply and returns true', async () => {
    const pendingPing = { id: 'ping-1' }
    mockGetPendingSatisfactionPing.mockResolvedValue(pendingPing)
    mockClassifyReply.mockReturnValue('positive')
    mockRecordSatisfactionReply.mockResolvedValue(true)

    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    mockSupabaseFrom.mockImplementation(() => ({ insert: mockInsert }))

    const result = await handleSatisfactionReply(makeLead(), 'Yes great!')
    expect(result).toBe(true)
    expect(mockClassifyReply).toHaveBeenCalledWith('Yes great!')
    expect(mockRecordSatisfactionReply).toHaveBeenCalledWith('ping-1', 'Yes great!', 'positive')
  })

  it('inserts satisfaction_negative event for negative replies', async () => {
    const pendingPing = { id: 'ping-2' }
    mockGetPendingSatisfactionPing.mockResolvedValue(pendingPing)
    mockClassifyReply.mockReturnValue('negative')
    mockRecordSatisfactionReply.mockResolvedValue(true)

    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    mockSupabaseFrom.mockImplementation(() => ({ insert: mockInsert }))

    await handleSatisfactionReply(makeLead(), 'No')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'satisfaction_negative' })
    )
  })
})

describe('findOrCreateLeadByPhone', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns existing lead when found locally', async () => {
    const existingLead = makeLead()
    const mockSingle = jest.fn().mockResolvedValue({ data: existingLead, error: null })
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: existingLead, error: null })
    const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })

    mockSupabaseFrom.mockReturnValue({ select: mockSelect })
    mockSingle.mockResolvedValue({ data: existingLead, error: null })

    const result = await findOrCreateLeadByPhone('+12025551234')
    expect(result).toEqual({ lead: existingLead })
  })

  it('returns error when FUB creation fails', async () => {
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    mockSupabaseFrom.mockReturnValue({ select: mockSelect })

    mockSearchLeadByPhone.mockResolvedValue(null)
    mockCreateLeadInFub.mockResolvedValue(null)

    const result = await findOrCreateLeadByPhone('+12025559999')
    expect('error' in result).toBe(true)
    expect((result as { error: string }).error).toContain('Failed to create lead in FUB')
  })
})

describe('getDefaultAgent', () => {
  beforeEach(() => jest.clearAllMocks())

  it('queries real_estate_agents by status=active (not is_active)', async () => {
    const mockLimit = jest.fn().mockResolvedValue({ data: null })
    const mockEq = jest.fn().mockReturnValue({ limit: mockLimit })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    mockSupabaseFrom.mockReturnValue({ select: mockSelect })

    await getDefaultAgent()

    expect(mockSupabaseFrom).toHaveBeenCalledWith('real_estate_agents')
    expect(mockEq).toHaveBeenCalledWith('status', 'active')
    expect(mockEq).not.toHaveBeenCalledWith('is_active', expect.anything())
  })

  it('returns null when no agents found', async () => {
    const mockLimit = jest.fn().mockResolvedValue({ data: [] })
    const mockEq = jest.fn().mockReturnValue({ limit: mockLimit })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    mockSupabaseFrom.mockReturnValue({ select: mockSelect })

    const result = await getDefaultAgent()
    expect(result).toBeNull()
  })

  it('returns mapped Agent with market and settings (hasRequiredAgent:true)', async () => {
    const dbRow = {
      id: 'agent-uuid-1',
      email: 'jane@realty.com',
      first_name: 'Jane',
      last_name: 'Smith',
      phone_number: '+15005550001',
      state: 'CA',
      status: 'active',
      timezone: 'America/Los_Angeles',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const mockLimit = jest.fn().mockResolvedValue({ data: [dbRow] })
    const mockEq = jest.fn().mockReturnValue({ limit: mockLimit })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    mockSupabaseFrom.mockReturnValue({ select: mockSelect })

    const agent = await getDefaultAgent()

    expect(agent).not.toBeNull()
    expect(agent!.name).toBe('Jane Smith')
    expect(agent!.is_active).toBe(true)
    // hasRequiredAgent check from twilio/route.ts: agent && agent.market && agent.settings
    const hasRequiredAgent = !!(agent && agent.market && agent.settings)
    expect(hasRequiredAgent).toBe(true)
  })
})
