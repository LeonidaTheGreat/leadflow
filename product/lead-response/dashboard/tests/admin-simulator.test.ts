/**
 * @jest-environment node
 *
 * Tests for Lead Experience Simulator API routes
 *
 * AC-1: Simulation runs without sending real SMS
 * AC-2: Conversation displays (returns chat-format turns)
 * AC-5: Demo link generates correctly
 * AC-6: Demo link expiry handled
 * AC-7: Simulation data stored in lead_simulations table
 */

import { NextRequest } from 'next/server'

// ============ Mock Supabase ============
const mockInsert = jest.fn()
const mockSelect = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn()
const mockUpdate = jest.fn()
const mockIn = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()

const mockFrom = jest.fn(() => ({
  insert: mockInsert.mockReturnThis(),
  select: mockSelect.mockReturnThis(),
  single: mockSingle,
  eq: mockEq.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  in: mockIn.mockReturnThis(),
  order: mockOrder.mockReturnThis(),
  limit: mockLimit.mockReturnThis(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}))

// ============ Tests: POST /api/admin/simulate-lead ============
describe('POST /api/admin/simulate-lead', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSingle.mockResolvedValue({
      data: { id: 'sim-123', lead_name: 'John', conversation: [] },
      error: null,
    })
    mockInsert.mockReturnThis()
    mockSelect.mockReturnThis()
  })

  it('returns 400 when leadName is missing', async () => {
    const { POST } = await import('../app/api/admin/simulate-lead/route')
    const req = new NextRequest('http://localhost/api/admin/simulate-lead', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('leadName')
  })

  it('returns conversation with 6 turns (3 lead + 3 AI)', async () => {
    const { POST } = await import('../app/api/admin/simulate-lead/route')
    const req = new NextRequest('http://localhost/api/admin/simulate-lead', {
      method: 'POST',
      body: JSON.stringify({ leadName: 'Alice', propertyInterest: '2BR downtown' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.conversation).toHaveLength(6)
    expect(json.conversation.filter((t: any) => t.role === 'lead')).toHaveLength(3)
    expect(json.conversation.filter((t: any) => t.role === 'ai')).toHaveLength(3)
  })

  it('includes "no real SMS" note in response', async () => {
    const { POST } = await import('../app/api/admin/simulate-lead/route')
    const req = new NextRequest('http://localhost/api/admin/simulate-lead', {
      method: 'POST',
      body: JSON.stringify({ leadName: 'Bob' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const json = await res.json()
    expect(json.note).toMatch(/no.*sms|dry.run/i)
  })

  it('stores simulation in Supabase', async () => {
    const { POST } = await import('../app/api/admin/simulate-lead/route')
    const req = new NextRequest('http://localhost/api/admin/simulate-lead', {
      method: 'POST',
      body: JSON.stringify({ leadName: 'Carol', propertyInterest: 'condo' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)
    expect(mockFrom).toHaveBeenCalledWith('lead_simulations')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ lead_name: 'Carol', outcome: 'completed' })
    )
  })
})

// ============ Tests: POST /api/admin/demo-link ============
describe('POST /api/admin/demo-link', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSingle.mockResolvedValue({
      data: {
        id: 'token-uuid',
        token: 'test-token-abc',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    })
    mockInsert.mockReturnThis()
    mockSelect.mockReturnThis()
  })

  it('generates a demo token and returns a URL', async () => {
    const { POST } = await import('../app/api/admin/demo-link/route')
    const req = new NextRequest('http://localhost/api/admin/demo-link', {
      method: 'POST',
      headers: { origin: 'https://leadflow.vercel.app' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.token).toBeDefined()
    expect(json.demoUrl).toMatch(/\/admin\/simulator\?demo=/)
    expect(json.expiresInHours).toBe(24)
  })

  it('stores token in demo_tokens table', async () => {
    const { POST } = await import('../app/api/admin/demo-link/route')
    const req = new NextRequest('http://localhost/api/admin/demo-link', {
      method: 'POST',
      headers: { origin: 'https://leadflow.vercel.app' },
    })
    await POST(req)
    expect(mockFrom).toHaveBeenCalledWith('demo_tokens')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 'stojan' })
    )
  })
})

// ============ Tests: GET /api/admin/demo-validate ============
describe('GET /api/admin/demo-validate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEq.mockReturnThis()
  })

  it('returns valid: false for missing token', async () => {
    const { GET } = await import('../app/api/admin/demo-validate/route')
    const req = new NextRequest('http://localhost/api/admin/demo-validate')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.valid).toBe(false)
  })

  it('returns valid: false for expired token', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'tid',
        token: 'expired',
        expires_at: new Date(Date.now() - 1000).toISOString(), // past
        used_count: 0,
      },
      error: null,
    })
    mockUpdate.mockReturnThis()
    const { GET } = await import('../app/api/admin/demo-validate/route')
    const req = new NextRequest('http://localhost/api/admin/demo-validate?token=expired')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.reason).toMatch(/expired/i)
  })

  it('returns valid: true for a valid unexpired token', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'tid',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        used_count: 0,
      },
      error: null,
    })
    mockUpdate.mockReturnValue({ eq: mockEq.mockResolvedValue({ error: null }) })
    const { GET } = await import('../app/api/admin/demo-validate/route')
    const req = new NextRequest('http://localhost/api/admin/demo-validate?token=valid-token')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.valid).toBe(true)
    expect(json.expiresAt).toBeDefined()
  })
})

// ============ Tests: GET /api/admin/conversations ============
describe('GET /api/admin/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty array when no leads exist', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })
    const { GET } = await import('../app/api/admin/conversations/route')
    const req = new NextRequest('http://localhost/api/admin/conversations')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.conversations).toEqual([])
  })

  it('masks phone numbers', async () => {
    mockLimit.mockResolvedValueOnce({
      data: [{
        id: 'lead-1',
        first_name: 'Dave',
        last_name: 'Smith',
        phone: '+14165551234',
        status: 'new',
        dnc: false,
        consent_sms: true,
        appointment_booked: false,
        created_at: new Date().toISOString(),
      }],
      error: null,
    })
    mockIn.mockResolvedValueOnce({
      data: [{ lead_id: 'lead-1' }],
      error: null,
    })
    const { GET } = await import('../app/api/admin/conversations/route')
    const req = new NextRequest('http://localhost/api/admin/conversations')
    const res = await GET(req)
    const json = await res.json()
    expect(json.conversations[0].phone).toMatch(/\*{3}.*1234/)
    expect(json.conversations[0].phone).not.toContain('416')
  })
})
