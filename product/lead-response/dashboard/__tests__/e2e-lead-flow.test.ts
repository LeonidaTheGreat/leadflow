/**
 * E2E Lead Flow Tests
 * Full pipeline: POST /api/webhook → AI qualification → SMS via Twilio
 * All external dependencies (DB, AI, Twilio) are mocked.
 */

// ── Mocks (before route require) ──────────────────────────────

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: jest.fn((b: unknown, i?: { status?: number }) => ({ body: b, status: i?.status ?? 200 })) },
}))

const mockGetLeadByPhone = jest.fn()
const mockCreateLead = jest.fn()
const mockUpdateLead = jest.fn()
const mockCreateMessage = jest.fn()
const mockLogEvent = jest.fn()
const mockQualificationsInsert = jest.fn()

let activeAgent = { id: 'agent-001', name: 'Jane Smith', market: 'us-national', settings: { auto_respond: true, booking_enabled: false }, calcom_username: null }

jest.mock('../lib/supabase', () => ({
  getLeadByPhone: (...a: unknown[]) => mockGetLeadByPhone(...a),
  createLead: (...a: unknown[]) => mockCreateLead(...a),
  updateLead: (...a: unknown[]) => mockUpdateLead(...a),
  createMessage: (...a: unknown[]) => mockCreateMessage(...a),
  logEvent: (...a: unknown[]) => mockLogEvent(...a),
  getAgentById: jest.fn().mockResolvedValue({ data: null }),
  supabaseAdmin: {
    from: (t: string) => {
      if (t === 'real_estate_agents') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [activeAgent] }) }
      if (t === 'qualifications') return { insert: mockQualificationsInsert }
      return { update: jest.fn().mockResolvedValue({}) }
    },
  },
}))

const mockQualifyLead = jest.fn()
const mockGenerateAiSmsResponse = jest.fn()
jest.mock('../lib/ai', () => ({
  qualifyLead: (...a: unknown[]) => mockQualifyLead(...a),
  generateAiSmsResponse: (...a: unknown[]) => mockGenerateAiSmsResponse(...a),
  calculateLeadScore: jest.fn().mockReturnValue(75),
}))

const mockSendAiSmsResponse = jest.fn()
jest.mock('../lib/twilio', () => ({
  sendAiSmsResponse: (...a: unknown[]) => mockSendAiSmsResponse(...a),
  normalizePhone: (p: string) => p.replace(/\D/g, ''),
}))

// ── Fixtures ──────────────────────────────────────────────────

const LEAD = { id: 'lead-abc', agent_id: 'agent-001', name: 'John', email: 'j@x.com', phone: '14165551234', source: 'website', status: 'new', location: null, budget_min: null, budget_max: null, timeline: null, latest_qualification: null }
const QUAL = { intent: 'buy', budget_min: 500000, budget_max: 750000, timeline: '1-3months', location: 'Toronto', property_type: 'house', bedrooms: 3, bathrooms: 2, square_feet: null, notes: null, confidence_score: 0.85, is_qualified: true, qualification_reason: 'Clear intent', raw_response: {} }
const SMS_RESP = { message: "Hi John, I'm Jane! Interested in Toronto? Reply STOP to opt out.", trigger: 'initial', confidence: 0.9, suggested_action: 'nurture', personalize: true }
const req = (body: unknown) => ({ json: () => Promise.resolve(body) })

// ── Import after mocks ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('../app/api/webhook/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextResponse } = require('next/server')

// ── Tests ─────────────────────────────────────────────────────

describe('E2E Lead Flow — POST /api/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    activeAgent = { id: 'agent-001', name: 'Jane Smith', market: 'us-national', settings: { auto_respond: true, booking_enabled: false }, calcom_username: null }
    mockGetLeadByPhone.mockResolvedValue({ data: null })
    mockCreateLead.mockResolvedValue({ data: LEAD })
    mockUpdateLead.mockResolvedValue({ data: LEAD })
    mockCreateMessage.mockResolvedValue({ data: { id: 'msg-1' } })
    mockLogEvent.mockResolvedValue({})
    mockQualifyLead.mockResolvedValue(QUAL)
    mockGenerateAiSmsResponse.mockResolvedValue(SMS_RESP)
    mockSendAiSmsResponse.mockResolvedValue({ success: true, messageSid: 'SM_001', status: 'queued', mock: false })
    mockQualificationsInsert.mockResolvedValue({ error: null })
  })

  it('creates lead, qualifies it, and sends SMS (full happy path)', async () => {
    await POST(req({ name: 'John', email: 'j@x.com', phone: '14165551234', source: 'website', message: 'Buy 3-bed Toronto $500k' }))

    expect(mockCreateLead).toHaveBeenCalledWith(expect.objectContaining({ phone: '14165551234', source: 'website', status: 'new' }))
    expect(mockQualifyLead).toHaveBeenCalledWith(expect.objectContaining({ phone: '14165551234' }))
    expect(mockQualificationsInsert).toHaveBeenCalledWith(expect.objectContaining({ lead_id: 'lead-abc', is_qualified: true, confidence_score: 0.85 }))
    expect(mockSendAiSmsResponse).toHaveBeenCalledTimes(1)
    expect(mockCreateMessage).toHaveBeenCalledWith(expect.objectContaining({ lead_id: 'lead-abc', direction: 'outbound', channel: 'sms', ai_generated: true, twilio_sid: 'SM_001' }))
    expect(NextResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, lead_id: 'lead-abc', qualified: true, sms_sent: true }))
  })

  it('short-circuits on duplicate phone — no lead created, no SMS', async () => {
    mockGetLeadByPhone.mockResolvedValue({ data: { id: 'lead-existing' } })
    await POST(req({ phone: '14165551234', source: 'website' }))

    expect(mockCreateLead).not.toHaveBeenCalled()
    expect(mockQualifyLead).not.toHaveBeenCalled()
    expect(mockSendAiSmsResponse).not.toHaveBeenCalled()
    expect(NextResponse.json).toHaveBeenCalledWith(expect.objectContaining({ lead_id: 'lead-existing', existing: true }))
  })

  it('returns 400 when phone is missing', async () => {
    await POST(req({ name: 'No Phone', source: 'website' }))
    expect(mockCreateLead).not.toHaveBeenCalled()
    expect(NextResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }), expect.objectContaining({ status: 400 }))
  })

  it('skips SMS for unqualified leads', async () => {
    mockQualifyLead.mockResolvedValue({ ...QUAL, is_qualified: false, confidence_score: 0.3 })
    await POST(req({ phone: '14165559999', source: 'website' }))

    expect(mockCreateLead).toHaveBeenCalled()
    expect(mockSendAiSmsResponse).not.toHaveBeenCalled()
    expect(NextResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, qualified: false, sms_sent: false }))
  })

  it('skips SMS when agent auto_respond is disabled', async () => {
    activeAgent = { ...activeAgent, settings: { auto_respond: false, booking_enabled: false } }
    await POST(req({ phone: '14165551234', source: 'website' }))

    expect(mockSendAiSmsResponse).not.toHaveBeenCalled()
    expect(NextResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, sms_sent: false }))
  })

  it('passes correct lead and agent to AI SMS generator', async () => {
    await POST(req({ name: 'Sarah', phone: '12125550101', source: 'fub' }))

    expect(mockGenerateAiSmsResponse).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-abc' }),
      expect.objectContaining({ id: 'agent-001' }),
      expect.objectContaining({ trigger: 'initial' })
    )
    expect(mockSendAiSmsResponse).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-abc' }),
      expect.objectContaining({ id: 'agent-001' }),
      SMS_RESP.message
    )
  })

  it('returns 500 when lead creation fails', async () => {
    mockCreateLead.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await POST(req({ phone: '14165551234', source: 'website' }))

    expect(mockQualifyLead).not.toHaveBeenCalled()
    expect(NextResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }), expect.objectContaining({ status: 500 }))
  })

  it('records lead + qualification even when Twilio send fails', async () => {
    mockSendAiSmsResponse.mockResolvedValue({ success: false, mock: false, messageSid: undefined })
    await POST(req({ phone: '14165551234', source: 'website' }))

    expect(mockCreateLead).toHaveBeenCalled()
    expect(mockQualificationsInsert).toHaveBeenCalled()
    expect(mockSendAiSmsResponse).toHaveBeenCalledTimes(1)
    expect(mockCreateMessage).not.toHaveBeenCalled()
    expect(NextResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, sms_sent: false }))
  })
})
