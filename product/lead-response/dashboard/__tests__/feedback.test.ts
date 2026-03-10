/**
 * Tests for /api/feedback route (US-2: Persistent Give Feedback button)
 */

// Mock Next.js server modules
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}))

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}))

// Mock nps-service
jest.mock('../lib/nps-service', () => ({
  submitProductFeedback: jest.fn(),
}))

import jwt from 'jsonwebtoken'
import { submitProductFeedback } from '../lib/nps-service'
import { NextResponse } from 'next/server'

const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>
const mockSubmitFeedback = submitProductFeedback as jest.MockedFunction<typeof submitProductFeedback>
const mockNextResponseJson = NextResponse.json as jest.MockedFunction<typeof NextResponse.json>

// Import route handler after mocks
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('../app/api/feedback/route')

function makeRequest(body: Record<string, unknown>, authToken?: string): { cookies: { get: (name: string) => { value: string } | undefined }; json: () => Promise<Record<string, unknown>> } {
  return {
    cookies: {
      get: (name: string) => {
        if (name === 'auth-token' && authToken) {
          return { value: authToken }
        }
        return undefined
      },
    },
    json: async () => body,
  }
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock: NextResponse.json returns a mock response
    mockNextResponseJson.mockImplementation((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status || 200,
      json: async () => body,
    } as any))
  })

  it('returns 401 when no auth cookie is present', async () => {
    const req = makeRequest({ feedbackType: 'bug', content: 'test' })
    await POST(req as any)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  })

  it('returns 401 when JWT is invalid', async () => {
    mockJwtVerify.mockImplementation(() => { throw new Error('invalid token') })
    const req = makeRequest({ feedbackType: 'bug', content: 'test' }, 'bad-token')
    await POST(req as any)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  })

  it('returns 400 when feedbackType is missing', async () => {
    mockJwtVerify.mockReturnValue({ userId: 'agent-123', email: 'a@b.com' } as any)
    const req = makeRequest({ content: 'test' }, 'valid-token')
    await POST(req as any)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Feedback type and content are required' },
      { status: 400 }
    )
  })

  it('returns 400 when content is missing', async () => {
    mockJwtVerify.mockReturnValue({ userId: 'agent-123', email: 'a@b.com' } as any)
    const req = makeRequest({ feedbackType: 'idea' }, 'valid-token')
    await POST(req as any)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Feedback type and content are required' },
      { status: 400 }
    )
  })

  it('returns 400 for invalid feedback type', async () => {
    mockJwtVerify.mockReturnValue({ userId: 'agent-123', email: 'a@b.com' } as any)
    const req = makeRequest({ feedbackType: 'unknown', content: 'test' }, 'valid-token')
    await POST(req as any)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/invalid feedback type/i) }),
      { status: 400 }
    )
  })

  it('returns 400 when content exceeds 500 chars', async () => {
    mockJwtVerify.mockReturnValue({ userId: 'agent-123', email: 'a@b.com' } as any)
    const longContent = 'a'.repeat(501)
    const req = makeRequest({ feedbackType: 'praise', content: longContent }, 'valid-token')
    await POST(req as any)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/500 characters/i) }),
      { status: 400 }
    )
  })

  it('returns 200 and success on valid submission', async () => {
    mockJwtVerify.mockReturnValue({ userId: 'agent-123', email: 'a@b.com' } as any)
    mockSubmitFeedback.mockResolvedValue({ success: true, feedbackId: 'fb-456' })

    const req = makeRequest({ feedbackType: 'idea', content: 'Would love dark mode!' }, 'valid-token')
    await POST(req as any)

    expect(mockSubmitFeedback).toHaveBeenCalledWith(
      'agent-123',
      'idea',
      'Would love dark mode!',
      { submitted_via: 'dashboard' }
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith({
      success: true,
      feedbackId: 'fb-456',
    })
  })

  it('returns 500 when submitProductFeedback fails', async () => {
    mockJwtVerify.mockReturnValue({ userId: 'agent-123', email: 'a@b.com' } as any)
    mockSubmitFeedback.mockResolvedValue({ success: false, error: 'DB error' })

    const req = makeRequest({ feedbackType: 'bug', content: 'Crash on load' }, 'valid-token')
    await POST(req as any)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'DB error' },
      { status: 500 }
    )
  })

  it('accepts all valid feedback types', async () => {
    mockJwtVerify.mockReturnValue({ userId: 'agent-123', email: 'a@b.com' } as any)
    mockSubmitFeedback.mockResolvedValue({ success: true, feedbackId: 'fb-1' })

    const validTypes = ['praise', 'bug', 'idea', 'frustration']
    for (const type of validTypes) {
      jest.clearAllMocks()
      mockJwtVerify.mockReturnValue({ userId: 'agent-123', email: 'a@b.com' } as any)
      mockSubmitFeedback.mockResolvedValue({ success: true, feedbackId: 'fb-1' })
      mockNextResponseJson.mockImplementation((body: unknown, init?: { status?: number }) => ({
        body,
        status: init?.status || 200,
        json: async () => body,
      } as any))

      const req = makeRequest({ feedbackType: type, content: 'test' }, 'valid-token')
      await POST(req as any)
      // Should call submitProductFeedback without errors for valid types
      expect(mockSubmitFeedback).toHaveBeenCalledWith('agent-123', type, 'test', { submitted_via: 'dashboard' })
    }
  })
})
