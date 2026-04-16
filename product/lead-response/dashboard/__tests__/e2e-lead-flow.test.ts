/**
 * E2E Lead Flow Tests
 *
 * Tests the full pipeline: webhook receives lead → AI qualification → SMS send
 * All external dependencies (DB, Twilio, AI) are mocked.
 *
 * Flow under test (app/api/webhook/route.ts):
 *   POST /api/webhook → normalizePhone → getLeadByPhone → createLead →
 *   getAgentById / find active agent → qualifyLead → supabaseAdmin.from('qualifications') →
 *   updateLead → logEvent → generateAiSmsResponse → sendAiSmsResponse → createMessage
 */

// ─────────────────────────────────────────────────────────────
// Mocks — must be declared before require() of route module
// ─────────────────────────────────────────────────────────────

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}))

// ── DB / Supabase mocks ──────────────────────────────────────

const mockGetLeadByPhone = jest.fn()
const mockCreateLead = jest.fn()
const mockUpdateLead = jest.fn()
const mockCreateMessage = jest.fn()
const mockLogEvent = jest.fn()
const mockGetAgentById = jest.fn()

const mockQualificationsInsert = jest.fn().mockResolvedValue({ error: null })

// Mutable active agent for per-test overrides
let activeAgentOverride: Record<string, unknown> | null = null

const mockSupabaseAdminFrom = jest.fn((table: string) => {
  if (table === 'real_estate_agents') {
    const agent = activeAgentOverride ?? mockAgent
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [agent], error: null }),
    }
  }
  if (table === 'qualifications') {
    return { insert: mockQualificationsInsert }
  }
  return { update: jest.fn().mockResolvedValue({ error: null }) }
})

jest.mock('../lib/supabase', () => ({
  getLeadByPhone: (...args: unknown[]) => mockGetLeadByPhone(...args),
  createLead: (...args: unknown[]) => mockCreateLead(...args),
  updateLead: (...args: unknown[]) => mockUpdateLead(...args),
  createMessage: (...args: unknown[]) => mockCreateMessage(...args),
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
  getAgentById: (...args: unknown[]) => mockGetAgentById(...args),
  supabaseAdmin: { from: (...args: unknown[]) => mockSupabaseAdminFrom(...args) },
}))

// ── AI mocks ─────────────────────────────────────────────────

const mockQualifyLead = jest.fn()
const mockGenerateAiSmsResponse = jest.fn()
const mockCalculateLeadScore = jest.fn().mockReturnValue(75)

jest.mock('../lib/ai', () => ({
  qualifyLead: (...args: unknown[]) => mockQualifyLead(...args),
  generateAiSmsResponse: (...args: unknown[]) => mockGenerateAiSmsResponse(...args),
  calculateLeadScore: (...args: unknown[]) => mockCalculateLeadScore(...args),
}))

// ── Twilio mock ───────────────────────────────────────────────

const mockSendAiSmsResponse = jest.fn()
const mockNormalizePhone = jest.fn((phone: string) => phone.replace(/\D/g, ''))

jest.mock('../lib/twilio', () => ({
  sendAiSmsResponse: (...args: unknown[]) => mockSendAiSmsResponse(...args),
  normalizePhone: (phone: string) => mockNormalizePhone(phone),
}))

// ─────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────

const mockAgent = {
  id: 'agent-001',
  name: 'Jane Smith',
  market: 'us-national',
  settings: { auto_respond: true, booking_enabled: false },
  calcom_username: null,
}

const mockLead = {
  id: 'lead-abc',
  agent_id: 'agent-001',
  name: 'John Buyer',
  email: 'john@example.com',
  phone: '14165551234',
  source: 'website',
  status: 'new',
  location: null,
  budget_min: null,
  budget_max: null,
  timeline: null,
  latest_qualification: null,
}

const mockQualification = {
  intent: 'buy',
  budget_min: 500000,
  budget_max: 750000,
  timeline: '1-3months',
  location: 'Toronto',
  property_type: 'house',
  bedrooms: 3,
  bathrooms: 2,
  square_feet: null,
  notes: null,
  confidence_score: 0.85,
  is_qualified: true,
  qualification_reason: 'Clear buy intent with budget',
  raw_response: {},
}

const mockAiSmsResponse = {
  message: "Hi John, I'm Jane! I saw you're interested in Toronto homes. Want to see some listings? Reply STOP to opt out.",
  trigger: 'initial',
  confidence: 0.9,
  suggested_action: 'nurture',
  personalize: true,
}

function makeRequest(body: unknown): { json: () => Promise<unknown> } {
  return { json: () => Promise.resolve(body) }
}

// ─────────────────────────────────────────────────────────────
// Import route after mocks
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('../app/api/webhook/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextResponse } = require('next/server')

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('E2E Lead Flow — POST /api/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    activeAgentOverride = null

    // Default: no existing lead
    mockGetLeadByPhone.mockResolvedValue({ data: null, error: null })
    // Default: lead creation succeeds
    mockCreateLead.mockResolvedValue({ data: mockLead, error: null })
    mockUpdateLead.mockResolvedValue({ data: mockLead, error: null })
    mockCreateMessage.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    mockLogEvent.mockResolvedValue({ data: null, error: null })
    // Default: AI qualification succeeds
    mockQualifyLead.mockResolvedValue(mockQualification)
    // Default: SMS generation succeeds
    mockGenerateAiSmsResponse.mockResolvedValue(mockAiSmsResponse)
    // Default: Twilio send succeeds
    mockSendAiSmsResponse.mockResolvedValue({
      success: true,
      messageSid: 'SM_test_sid_001',
      status: 'queued',
      mock: false,
    })
    // Default: qualifications insert succeeds
    mockQualificationsInsert.mockResolvedValue({ error: null })
  })

  // ── 1. Happy path: full pipeline ─────────────────────────
  it('creates lead, qualifies it, and sends SMS for a valid inbound lead', async () => {
    const req = makeRequest({
      name: 'John Buyer',
      email: 'john@example.com',
      phone: '14165551234',
      source: 'website',
      message: 'Looking to buy a 3-bed house in Toronto, budget $500k-$750k',
    })

    await POST(req)

    // Lead was created
    expect(mockCreateLead).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '14165551234',
        source: 'website',
        status: 'new',
      })
    )

    // AI qualification ran
    expect(mockQualifyLead).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '14165551234', source: 'website' })
    )

    // Qualification saved to DB
    expect(mockQualificationsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        lead_id: 'lead-abc',
        is_qualified: true,
        confidence_score: 0.85,
      })
    )

    // SMS sent via Twilio
    expect(mockSendAiSmsResponse).toHaveBeenCalledTimes(1)

    // Message record created
    expect(mockCreateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        lead_id: 'lead-abc',
        direction: 'outbound',
        channel: 'sms',
        ai_generated: true,
        twilio_sid: 'SM_test_sid_001',
      })
    )

    // Response indicates success (route returns 200 without explicit status arg)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead_id: 'lead-abc',
        qualified: true,
        sms_sent: true,
      })
    )
  })

  // ── 2. Duplicate lead short-circuits ─────────────────────
  it('returns early with existing lead id when duplicate phone is detected', async () => {
    mockGetLeadByPhone.mockResolvedValue({ data: { id: 'lead-existing-999' }, error: null })

    const req = makeRequest({
      name: 'John Buyer',
      phone: '14165551234',
      source: 'website',
    })

    await POST(req)

    // No new lead created
    expect(mockCreateLead).not.toHaveBeenCalled()
    // No AI run
    expect(mockQualifyLead).not.toHaveBeenCalled()
    // No SMS sent
    expect(mockSendAiSmsResponse).not.toHaveBeenCalled()

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: 'lead-existing-999', existing: true })
    )
  })

  // ── 3. Missing required fields returns 400 ───────────────
  it('returns 400 when phone is missing', async () => {
    const req = makeRequest({ name: 'No Phone', source: 'website' })

    await POST(req)

    expect(mockCreateLead).not.toHaveBeenCalled()
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      expect.objectContaining({ status: 400 })
    )
  })

  // ── 4. Unqualified lead: SMS not sent ────────────────────
  it('does not send SMS when lead is not qualified', async () => {
    mockQualifyLead.mockResolvedValue({
      ...mockQualification,
      is_qualified: false,
      qualification_reason: 'Vague inquiry, no specifics',
      confidence_score: 0.3,
    })

    const req = makeRequest({
      phone: '14165559999',
      source: 'website',
    })

    await POST(req)

    // Lead still created
    expect(mockCreateLead).toHaveBeenCalled()
    // Qualification ran
    expect(mockQualifyLead).toHaveBeenCalled()
    // SMS NOT sent for unqualified lead
    expect(mockSendAiSmsResponse).not.toHaveBeenCalled()
    expect(mockCreateMessage).not.toHaveBeenCalled()

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, qualified: false, sms_sent: false })
    )
  })

  // ── 5. Agent auto_respond=false: SMS not sent ────────────
  it('does not send SMS when agent has auto_respond disabled', async () => {
    activeAgentOverride = { ...mockAgent, settings: { auto_respond: false, booking_enabled: false } }

    const req = makeRequest({
      phone: '14165551234',
      source: 'website',
    })

    await POST(req)

    expect(mockSendAiSmsResponse).not.toHaveBeenCalled()
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, sms_sent: false })
    )
  })

  // ── 6. AI SMS content is personalized ───────────────────
  it('sends AI-generated message with correct lead and agent context', async () => {
    const req = makeRequest({
      name: 'Sarah Connor',
      phone: '12125550101',
      source: 'fub',
      message: 'Interested in buying',
    })

    await POST(req)

    // AI was asked to generate a personalized response with correct args
    expect(mockGenerateAiSmsResponse).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-abc' }),
      expect.objectContaining({ id: 'agent-001' }),
      expect.objectContaining({ trigger: 'initial' })
    )

    // The generated message body was passed to Twilio
    expect(mockSendAiSmsResponse).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-abc' }),
      expect.objectContaining({ id: 'agent-001' }),
      mockAiSmsResponse.message
    )
  })

  // ── 7. Lead creation DB failure returns 500 ──────────────
  it('returns 500 when lead creation fails', async () => {
    mockCreateLead.mockResolvedValue({ data: null, error: { message: 'DB connection error' } })

    const req = makeRequest({
      phone: '14165551234',
      source: 'website',
    })

    await POST(req)

    expect(mockQualifyLead).not.toHaveBeenCalled()
    expect(mockSendAiSmsResponse).not.toHaveBeenCalled()
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      expect.objectContaining({ status: 500 })
    )
  })

  // ── 8. Twilio failure does not break the lead record ─────
  it('records lead and qualification even when Twilio send fails', async () => {
    mockSendAiSmsResponse.mockResolvedValue({
      success: false,
      mock: false,
      messageSid: undefined,
      error: 'Twilio unavailable',
    })

    const req = makeRequest({
      phone: '14165551234',
      source: 'website',
    })

    await POST(req)

    // Lead was still created
    expect(mockCreateLead).toHaveBeenCalled()
    // Qualification still ran and was saved
    expect(mockQualificationsInsert).toHaveBeenCalled()
    // SMS was attempted
    expect(mockSendAiSmsResponse).toHaveBeenCalledTimes(1)
    // No message record on failure
    expect(mockCreateMessage).not.toHaveBeenCalled()

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, sms_sent: false })
    )
  })
})
