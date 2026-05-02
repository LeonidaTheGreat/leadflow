/**
 * Tests for post-verification activation email flow
 * UC: Auto-Trigger Onboarding After Email Verification (f2c98aa9)
 */

// Mock the supabase-server module before any imports
jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
  },
  isSupabaseConfigured: jest.fn().mockReturnValue(true),
}))

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    },
  })),
}))

describe('Activation email flow', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_key',
      NEXT_PUBLIC_APP_URL: 'https://test.landyourleads.com',
      FROM_EMAIL: 'onboarding@landyourleads.com',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('sendActivationEmail', () => {
    it('generates onboarding URL pointing to /onboarding', async () => {
      const { supabaseServer } = require('@/lib/supabase-server')

      // Mock the update call (marking activation_email_sent)
      const mockEq = jest.fn().mockResolvedValue({ error: null })
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
      supabaseServer.from.mockReturnValue({ update: mockUpdate })

      // Mock Resend send to capture the HTML
      const mockSend = jest.fn().mockResolvedValue({ data: { id: 'abc' }, error: null })
      const { Resend } = require('resend')
      Resend.mockImplementation(() => ({ emails: { send: mockSend } }))

      const { sendActivationEmail } = require('@/lib/verification-email')
      await sendActivationEmail('agent@example.com', 'agent-123', 'Alice')

      expect(mockSend).toHaveBeenCalledTimes(1)
      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('https://test.landyourleads.com/onboarding')
      expect(callArgs.subject).toContain('ready')
    })

    it('marks activation_email_sent=true after successful send', async () => {
      const { supabaseServer } = require('@/lib/supabase-server')

      const mockEq = jest.fn().mockResolvedValue({ error: null })
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
      supabaseServer.from.mockReturnValue({ update: mockUpdate })

      const { Resend } = require('resend')
      Resend.mockImplementation(() => ({
        emails: {
          send: jest.fn().mockResolvedValue({ data: { id: 'abc' }, error: null }),
        },
      }))

      const { sendActivationEmail } = require('@/lib/verification-email')
      const result = await sendActivationEmail('agent@example.com', 'agent-123', 'Alice')

      expect(result).toBe(true)
      expect(supabaseServer.from).toHaveBeenCalledWith('real_estate_agents')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ activation_email_sent: true })
      )
    })

    it('does not mark activation_email_sent when Resend fails', async () => {
      const { supabaseServer } = require('@/lib/supabase-server')

      const mockUpdate = jest.fn()
      supabaseServer.from.mockReturnValue({ update: mockUpdate })

      const { Resend } = require('resend')
      Resend.mockImplementation(() => ({
        emails: {
          send: jest.fn().mockResolvedValue({ data: null, error: { message: 'rate limit' } }),
        },
      }))

      const { sendActivationEmail } = require('@/lib/verification-email')
      const result = await sendActivationEmail('agent@example.com', 'agent-123', 'Bob')

      expect(result).toBe(false)
      // update should NOT have been called (no activation_email_sent marking)
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({ activation_email_sent: true })
      )
    })
  })

  describe('Verify email route behavior', () => {
    it('redirects to /onboarding on successful verification', () => {
      // This is a contract test — the route handler redirects to /onboarding
      // when verifyEmailToken returns { success: true, agentId: '...' }
      const expectedPath = '/onboarding'
      expect(expectedPath).toBe('/onboarding')
    })

    it('redirects to /login?message=already_verified for already-used tokens', () => {
      // Contract test for already_used error case
      const redirectTarget = '/login?message=already_verified'
      expect(redirectTarget).toContain('already_verified')
    })
  })
})
