/**
 * Unit tests for verify-email route handler
 * Verifies the fire-and-forget activation email trigger on successful verification.
 * UC: feat-auto-activation-email-on-verification
 */

const mockVerifyEmailToken = jest.fn()
const mockSendActivationEmail = jest.fn()

jest.mock('@/lib/verification-email', () => ({
  verifyEmailToken: mockVerifyEmailToken,
  sendActivationEmail: mockSendActivationEmail,
}))

const mockSupabaseFrom = jest.fn()
jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: mockSupabaseFrom,
  },
}))

const mockRedirect = jest.fn()
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    redirect: mockRedirect,
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))

function makeRequest(token?: string): any {
  const base = 'https://app.example.com'
  const url = token
    ? `${base}/api/auth/verify-email?token=${token}`
    : `${base}/api/auth/verify-email`
  return { url }
}

describe('GET /api/auth/verify-email', () => {
  let GET: (req: any) => Promise<any>

  beforeAll(async () => {
    const route = await import('./route')
    GET = route.GET
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockRedirect.mockImplementation((url: URL) => ({
      status: 302,
      _url: url,
    }))
    mockSendActivationEmail.mockResolvedValue(true)
  })

  it('redirects to check-your-inbox when token is missing', async () => {
    await GET(makeRequest())
    expect(mockVerifyEmailToken).not.toHaveBeenCalled()
    const redirectArg: URL = mockRedirect.mock.calls[0][0]
    expect(redirectArg.pathname).toBe('/check-your-inbox')
    expect(redirectArg.searchParams.get('error')).toBe('invalid_token')
  })

  it('calls sendActivationEmail fire-and-forget on successful verification', async () => {
    mockVerifyEmailToken.mockResolvedValue({ success: true, agentId: 'agent-42' })
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { email: 'agent@example.com', first_name: 'Alice', activation_email_sent: false },
            error: null,
          }),
        }),
      }),
    })

    await GET(makeRequest('valid-token-abc'))
    // Drain microtask queue so fire-and-forget resolves
    await Promise.resolve()

    expect(mockSendActivationEmail).toHaveBeenCalledWith('agent@example.com', 'agent-42', 'Alice')
    const redirectArg: URL = mockRedirect.mock.calls[0][0]
    expect(redirectArg.pathname).toBe('/onboarding')
  })

  it('skips sendActivationEmail when activation_email_sent is already true', async () => {
    mockVerifyEmailToken.mockResolvedValue({ success: true, agentId: 'agent-42' })
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { email: 'agent@example.com', first_name: 'Bob', activation_email_sent: true },
            error: null,
          }),
        }),
      }),
    })

    await GET(makeRequest('valid-token-def'))
    await Promise.resolve()

    expect(mockSendActivationEmail).not.toHaveBeenCalled()
    const redirectArg: URL = mockRedirect.mock.calls[0][0]
    expect(redirectArg.pathname).toBe('/onboarding')
  })

  it('redirects to check-your-inbox on expired token', async () => {
    mockVerifyEmailToken.mockResolvedValue({ success: false, error: 'expired' })

    await GET(makeRequest('expired-token'))

    const redirectArg: URL = mockRedirect.mock.calls[0][0]
    expect(redirectArg.pathname).toBe('/check-your-inbox')
    expect(redirectArg.searchParams.get('error')).toBe('link_expired')
    expect(mockSendActivationEmail).not.toHaveBeenCalled()
  })

  it('redirects to login on already-used token', async () => {
    mockVerifyEmailToken.mockResolvedValue({ success: false, error: 'already_used' })

    await GET(makeRequest('used-token'))

    const redirectArg: URL = mockRedirect.mock.calls[0][0]
    expect(redirectArg.pathname).toBe('/login')
    expect(redirectArg.searchParams.get('message')).toBe('already_verified')
    expect(mockSendActivationEmail).not.toHaveBeenCalled()
  })

  it('redirects to check-your-inbox on invalid token', async () => {
    mockVerifyEmailToken.mockResolvedValue({ success: false, error: 'invalid' })

    await GET(makeRequest('bad-token'))

    const redirectArg: URL = mockRedirect.mock.calls[0][0]
    expect(redirectArg.pathname).toBe('/check-your-inbox')
    expect(redirectArg.searchParams.get('error')).toBe('invalid_token')
    expect(mockSendActivationEmail).not.toHaveBeenCalled()
  })
})
