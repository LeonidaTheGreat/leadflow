/**
 * @jest-environment node
 */

const mockDeleteSession = jest.fn()
const mockCookieSet = jest.fn()

jest.mock('@/lib/services/AuthService', () => ({
  deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn(() => ({
      cookies: {
        set: mockCookieSet,
      },
    })),
  },
}))

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deletes DB session when cookie exists and clears leadflow_session cookie', async () => {
    const { POST } = await import('./route')

    const request = {
      cookies: {
        get: () => ({ value: 'session-token-123' }),
      },
    } as any

    await POST(request)

    expect(mockDeleteSession).toHaveBeenCalledWith('session-token-123')
    expect(mockCookieSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'leadflow_session',
        value: '',
        maxAge: 0,
        path: '/',
      })
    )
  })
})
