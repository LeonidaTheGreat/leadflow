/**
 * @jest-environment node
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockJson = jest.fn((body: unknown, init?: { status?: number }) => ({
  body,
  status: init?.status ?? 200,
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (...args: unknown[]) => mockJson(...args),
  },
}))

const mockSupabaseFrom = jest.fn()
const mockCreateLead = jest.fn()
const mockGetLeadByPhone = jest.fn()
const mockUpdateLead = jest.fn()
const mockCreateMessage = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockSupabaseFrom(...args) },
  createLead: (...args: unknown[]) => mockCreateLead(...args),
  getLeadByPhone: (...args: unknown[]) => mockGetLeadByPhone(...args),
  updateLead: (...args: unknown[]) => mockUpdateLead(...args),
  createMessage: (...args: unknown[]) => mockCreateMessage(...args),
}))

const mockQualifyLead = jest.fn()
const mockGenerateAiSmsResponse = jest.fn()
const mockCalculateLeadScore = jest.fn(() => 75)

jest.mock('@/lib/ai', () => ({
  qualifyLead: (...args: unknown[]) => mockQualifyLead(...args),
  generateAiSmsResponse: (...args: unknown[]) => mockGenerateAiSmsResponse(...args),
  calculateLeadScore: (...args: unknown[]) => mockCalculateLeadScore(...args),
}))

const mockSendAiSmsResponse = jest.fn()
const mockNormalizePhone = jest.fn((p: string) => p)
const mockSendSms = jest.fn()

jest.mock('@/lib/twilio', () => ({
  sendAiSmsResponse: (...args: unknown[]) => mockSendAiSmsResponse(...args),
  normalizePhone: (p: string) => mockNormalizePhone(p),
  sendSms: (...args: unknown[]) => mockSendSms(...args),
}))

const mockLogSmsActivity = jest.fn()
const mockLogQualification = jest.fn()

jest.mock('@/lib/fub', () => ({
  logSmsActivity: (...args: unknown[]) => mockLogSmsActivity(...args),
  logQualification: (...args: unknown[]) => mockLogQualification(...args),
}))

import {
  mapFubStatus,
  handleLeadCreated,
  handleLeadUpdated,
  handleLeadAssigned,
} from '../lib/services/fub-webhook-service'

// ── Helpers ────────────────────────────────────────────────────────────────────

const defaultQualification = {
  intent: 'buy',
  budget_min: 200000,
  budget_max: 500000,
  timeline: '3-6 months',
  location: 'Austin TX',
  property_type: 'single_family',
  bedrooms: 3,
  bathrooms: 2,
  notes: '',
  confidence_score: 0.8,
  is_qualified: true,
  qualification_reason: 'Ready to buy',
  raw_response: '',
}

function makeFubLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fub-123',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phoneNumber: '+15125551234',
    source: 'Zillow',
    status: 'New Lead',
    consents: { sms: true, email: false },
    agentId: null,
    ...overrides,
  }
}

function makeDbAgent() {
  return {
    id: 'agent-1',
    name: 'Bob Agent',
    email: 'bob@leadflow.ai',
    market: 'us-texas',
    timezone: 'America/Chicago',
    status: 'active',
  }
}

function makeDbLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-db-1',
    fub_id: 'fub-123',
    agent_id: 'agent-1',
    name: 'Jane Smith',
    phone: '+15125551234',
    email: 'jane@example.com',
    consent_sms: true,
    consent_email: false,
    dnc: false,
    status: 'new',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('mapFubStatus', () => {
  it('maps known FUB statuses to internal statuses', () => {
    expect(mapFubStatus('New Lead')).toBe('new')
    expect(mapFubStatus('Working')).toBe('qualified')
    expect(mapFubStatus('Appointment Set')).toBe('appointment')
    expect(mapFubStatus('Dead')).toBe('dnc')
  })

  it('defaults unknown statuses to new', () => {
    expect(mapFubStatus('Unknown Status')).toBe('new')
    expect(mapFubStatus('')).toBe('new')
  })
})

describe('handleLeadCreated', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.FUB_API_KEY = 'test-key'
    process.env.FUB_SYSTEM_NAME = 'LeadFlow-Test'
    process.env.FUB_SYSTEM_KEY = 'sys-key'
  })

  it('returns success with existing=true for already-known leads', async () => {
    const existingLead = makeDbLead()
    mockGetLeadByPhone.mockResolvedValue({ data: existingLead, error: null })

    const result = await handleLeadCreated(makeFubLead())

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, existing: true })
    )
  })

  it('returns 400 when lead has no phone number', async () => {
    mockNormalizePhone.mockReturnValueOnce('')

    await handleLeadCreated(makeFubLead({ phoneNumber: '', phones: [] }))

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Lead has no phone number' }),
      expect.objectContaining({ status: 400 })
    )
  })

  it('creates lead, qualifies it, and sends AI SMS for new leads with consent', async () => {
    mockGetLeadByPhone.mockResolvedValue({ data: null, error: null })

    const agent = makeDbAgent()
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'real_estate_agents') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [agent], error: null }),
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }
      }
      if (table === 'qualifications') return { insert: jest.fn().mockResolvedValue({ error: null }) }
      return {}
    })

    const newLead = makeDbLead()
    mockCreateLead.mockResolvedValue({ data: newLead, error: null })
    mockQualifyLead.mockResolvedValue(defaultQualification)
    mockUpdateLead.mockResolvedValue({ data: newLead, error: null })
    mockLogQualification.mockResolvedValue(undefined)
    mockGenerateAiSmsResponse.mockResolvedValue({ message: 'Hi Jane! Reply STOP to opt out.', confidence: 0.9 })
    mockSendAiSmsResponse.mockResolvedValue({ success: true, messageSid: 'SM123', status: 'sent', mock: false })
    mockCreateMessage.mockResolvedValue({ data: {}, error: null })
    mockLogSmsActivity.mockResolvedValue(undefined)

    await handleLeadCreated(makeFubLead())

    expect(mockCreateLead).toHaveBeenCalled()
    expect(mockQualifyLead).toHaveBeenCalled()
    expect(mockSendAiSmsResponse).toHaveBeenCalled()
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, sms_sent: true })
    )
  })

  it('skips SMS when lead has no sms consent', async () => {
    mockGetLeadByPhone.mockResolvedValue({ data: null, error: null })

    const agent = makeDbAgent()
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'real_estate_agents') {
        return {
          select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [agent], error: null }) }) }),
        }
      }
      if (table === 'qualifications') return { insert: jest.fn().mockResolvedValue({ error: null }) }
      return {}
    })

    const leadNoConsent = makeDbLead({ consent_sms: false })
    mockCreateLead.mockResolvedValue({ data: leadNoConsent, error: null })
    mockQualifyLead.mockResolvedValue(defaultQualification)
    mockUpdateLead.mockResolvedValue({ data: leadNoConsent, error: null })
    mockLogQualification.mockResolvedValue(undefined)

    await handleLeadCreated(makeFubLead({ consents: { sms: false, email: false } }))

    expect(mockSendAiSmsResponse).not.toHaveBeenCalled()
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ sms_sent: false, reason: 'no_consent' })
    )
  })
})

describe('handleLeadUpdated', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 404 when lead not found in db', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    })

    await handleLeadUpdated(makeFubLead())

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Lead not found' }),
      expect.objectContaining({ status: 404 })
    )
  })

  it('updates name/email/status for known lead', async () => {
    const lead = makeDbLead()
    mockSupabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: lead, error: null }) }) }),
    })
    mockUpdateLead.mockResolvedValue({ data: lead, error: null })

    await handleLeadUpdated(makeFubLead({ status: 'Working' }))

    expect(mockUpdateLead).toHaveBeenCalledWith(
      'lead-db-1',
      expect.objectContaining({ status: 'qualified' })
    )
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('handleLeadAssigned', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns no_agent_found when agent does not exist', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    })

    await handleLeadAssigned(makeFubLead({ agentId: 'fub-agent-999' }))

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, reason: 'no_agent_found' })
    )
  })

  it('sends intro SMS when all conditions met', async () => {
    const agent = makeDbAgent()
    const lead = makeDbLead({ consent_sms: true, dnc: false })

    let callCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'real_estate_agents') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: agent, error: null }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }
      }
      if (table === 'leads') {
        callCount++
        if (callCount === 1) {
          // update assignment
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) }
        }
        // select lead
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: lead, error: null }) }),
          }),
        }
      }
      return {}
    })

    mockSendSms.mockResolvedValue({ success: true, messageSid: 'SM456', status: 'sent', mock: false })
    mockCreateMessage.mockResolvedValue({ data: {}, error: null })
    mockLogSmsActivity.mockResolvedValue(undefined)

    await handleLeadAssigned(makeFubLead({ agentId: 'fub-agent-1', id: 'fub-123' }))

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, sms_sent: true })
    )
  })
})
