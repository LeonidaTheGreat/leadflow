/**
 * Tests for /api/lead-capture — Lead Magnet Email Capture
 * UC: feat-lead-magnet-email-capture
 *
 * Covers all 7 acceptance criteria from the PRD:
 *   AC-2: Successful capture → DB upsert + success response
 *   AC-3: Invalid email rejected
 *   AC-5: Duplicate email handled gracefully (silently succeed)
 *   AC-6: UTM parameters captured
 *   AC-4: Email triggered on success
 *   Additional: missing body, OPTIONS preflight, server errors
 */

// ─────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      body,
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
    })),
  },
}))

// Mock Supabase — default: upsert succeeds
const mockUpsert = jest.fn().mockResolvedValue({ error: null })
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }))

jest.mock('../lib/supabase-server', () => ({
  supabaseServer: { from: (...args: unknown[]) => mockFrom(...args) },
  isSupabaseConfigured: jest.fn(() => true),
}))

// Mock lead-magnet-email service
const mockSendPlaybookEmail = jest.fn().mockResolvedValue({ sent: true, provider: 'resend' })
jest.mock('../lib/lead-magnet-email', () => ({
  sendPlaybookEmail: (...args: unknown[]) => mockSendPlaybookEmail(...args),
}))

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Build a minimal NextRequest-like mock */
function makeRequest(body: unknown): { json: () => Promise<unknown> } {
  return { json: () => Promise.resolve(body) }
}

// ─────────────────────────────────────────────────────────────
// Import after mocks
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST, OPTIONS } = require('../app/api/lead-capture/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextResponse } = require('next/server')

// ─────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────

describe('/api/lead-capture', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
    mockSendPlaybookEmail.mockResolvedValue({ sent: true, provider: 'resend' })
  })

  // ── OPTIONS preflight ────────────────────────────────────
  describe('OPTIONS preflight', () => {
    it('returns 200 with CORS headers', async () => {
      await OPTIONS()
      expect(NextResponse.json).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          headers: expect.objectContaining({ 'Access-Control-Allow-Origin': '*' }),
        })
      )
    })
  })

  // ── AC-3: Invalid email rejected ─────────────────────────
  describe('Email validation (AC-3)', () => {
    const invalidEmails = ['notanemail', '@nodomain', 'missing@', '', '  ']

    it.each(invalidEmails)('rejects invalid email "%s"', async (email) => {
      const req = makeRequest({ email })
      await POST(req)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid email address' },
        expect.objectContaining({ status: 400 })
      )
      // API must NOT be called (no DB write)
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('returns 400 when email field is missing', async () => {
      const req = makeRequest({ firstName: 'Sarah' })
      await POST(req)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid email address' },
        expect.objectContaining({ status: 400 })
      )
    })

    it('returns 400 for invalid JSON body', async () => {
      const badReq = { json: () => Promise.reject(new SyntaxError('bad json')) }
      await POST(badReq)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Invalid request body' },
        expect.objectContaining({ status: 400 })
      )
    })
  })

  // ── AC-2: Successful capture ─────────────────────────────
  describe('Successful capture (AC-2)', () => {
    it('upserts email into pilot_signups with source=lead_magnet and status=nurture', async () => {
      const req = makeRequest({ email: 'agent@realty.com', firstName: 'Sarah' })
      await POST(req)

      expect(mockFrom).toHaveBeenCalledWith('pilot_signups')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'agent@realty.com',
          first_name: 'Sarah',
          source: 'lead_magnet',
          status: 'nurture',
        }),
        expect.objectContaining({ onConflict: 'email' })
      )
    })

    it('returns { success: true, message: "Playbook sent!" }', async () => {
      const req = makeRequest({ email: 'agent@realty.com' })
      await POST(req)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: true, message: 'Playbook sent!' },
        expect.objectContaining({ status: 200 })
      )
    })

    it('triggers sendPlaybookEmail on success (AC-4)', async () => {
      const req = makeRequest({ email: 'agent@realty.com', firstName: 'Alice' })
      await POST(req)

      // Give fire-and-forget a tick to resolve
      await new Promise((r) => setTimeout(r, 0))

      expect(mockSendPlaybookEmail).toHaveBeenCalledWith('agent@realty.com', 'Alice')
    })

    it('normalises email to lowercase', async () => {
      const req = makeRequest({ email: 'AGENT@REALTY.COM' })
      await POST(req)

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'agent@realty.com' }),
        expect.anything()
      )
    })
  })

  // ── AC-5: Duplicate email handled gracefully ─────────────
  describe('Duplicate email (AC-5)', () => {
    it('returns success even when upsert silently overwrites existing row', async () => {
      // Upsert succeeds (no error) even for duplicates
      mockUpsert.mockResolvedValue({ error: null })
      const req = makeRequest({ email: 'existing@realty.com' })
      await POST(req)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: true, message: 'Playbook sent!' },
        expect.objectContaining({ status: 200 })
      )
    })
  })

  // ── AC-6: UTM parameters captured ────────────────────────
  describe('UTM parameter capture (AC-6)', () => {
    it('stores utmSource, utmMedium, utmCampaign in pilot_signups', async () => {
      const req = makeRequest({
        email: 'agent@realty.com',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'realtor-q1',
      })
      await POST(req)

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'realtor-q1',
        }),
        expect.anything()
      )
    })

    it('stores null for missing UTM params', async () => {
      const req = makeRequest({ email: 'agent@realty.com' })
      await POST(req)

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          utm_source: null,
          utm_medium: null,
          utm_campaign: null,
        }),
        expect.anything()
      )
    })
  })

  // ── Server errors ─────────────────────────────────────────
  describe('Error handling', () => {
    it('returns 500 on DB error', async () => {
      mockUpsert.mockResolvedValue({ error: { message: 'connection refused' } })
      const req = makeRequest({ email: 'agent@realty.com' })
      await POST(req)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Failed to save. Please try again.' },
        expect.objectContaining({ status: 500 })
      )
    })

    it('returns 500 when Supabase is not configured', async () => {
      // Temporarily override isSupabaseConfigured
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sbModule = require('../lib/supabase-server')
      sbModule.isSupabaseConfigured.mockReturnValueOnce(false)

      const req = makeRequest({ email: 'agent@realty.com' })
      await POST(req)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: 'Server configuration error' },
        expect.objectContaining({ status: 500 })
      )
    })
  })

  // ── Optional firstName field ──────────────────────────────
  describe('Optional fields', () => {
    it('accepts submission with no firstName', async () => {
      const req = makeRequest({ email: 'agent@realty.com' })
      await POST(req)

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: null }),
        expect.anything()
      )
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: true, message: 'Playbook sent!' },
        expect.objectContaining({ status: 200 })
      )
    })

    it('trims whitespace from firstName', async () => {
      const req = makeRequest({ email: 'agent@realty.com', firstName: '  Sarah  ' })
      await POST(req)

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: 'Sarah' }),
        expect.anything()
      )
    })
  })
})
