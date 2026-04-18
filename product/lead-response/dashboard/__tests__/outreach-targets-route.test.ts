/**
 * @jest-environment node
 */
// E2E test for PR #1256 — /api/admin/outreach/targets route

const mockJson = jest.fn((body: unknown, init?: { status?: number }) => ({
  body,
  status: init?.status ?? 200,
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (...args: unknown[]) => mockJson(...args),
  },
}))

const mockSelect = jest.fn()
const mockOrder = jest.fn()
const mockIn = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/db', () => ({
  postgrestAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}))

import { GET } from '../app/api/admin/outreach/targets/route'

function makeRequest(token: string | null): any {
  return { headers: { get: (h: string) => (h === 'x-admin-token' ? token : null) } }
}

describe('GET /api/admin/outreach/targets', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...OLD_ENV, ADMIN_SECRET: 'test-secret-123' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('returns 401 when no token provided', async () => {
    await GET(makeRequest(null) as any)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 })
  })

  it('returns 401 when wrong token provided', async () => {
    await GET(makeRequest('wrong-token') as any)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 })
  })

  it('returns 401 when ADMIN_SECRET is not configured', async () => {
    delete process.env.ADMIN_SECRET
    await GET(makeRequest('test-secret-123') as any)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 })
  })

  it('returns enriched targets with last_touch on success', async () => {
    const fakeTargets = [
      { id: 'abc', name: 'Alice', email: 'alice@test.com', location: 'LA', brokerage: 'RE/MAX', status: 'identified', created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]
    const fakeTouchpoints = [
      { target_id: 'abc', sent_at: '2026-04-15T10:00:00' },
    ]

    mockFrom
      .mockReturnValueOnce({ select: () => ({ order: () => Promise.resolve({ data: fakeTargets, error: null }) }) })
      .mockReturnValueOnce({ select: () => ({ in: () => ({ order: () => Promise.resolve({ data: fakeTouchpoints, error: null }) }) }) })

    await GET(makeRequest('test-secret-123') as any)

    expect(mockJson).toHaveBeenCalledWith({
      targets: [{ ...fakeTargets[0], last_touch: '2026-04-15T10:00:00' }],
    })
  })

  it('returns targets with null last_touch when no touchpoints exist', async () => {
    const fakeTargets = [
      { id: 'xyz', name: 'Bob', email: 'bob@test.com', location: null, brokerage: null, status: 'contacted', created_at: '2026-01-02', updated_at: '2026-01-02' },
    ]

    mockFrom
      .mockReturnValueOnce({ select: () => ({ order: () => Promise.resolve({ data: fakeTargets, error: null }) }) })
      .mockReturnValueOnce({ select: () => ({ in: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) })

    await GET(makeRequest('test-secret-123') as any)

    expect(mockJson).toHaveBeenCalledWith({
      targets: [{ ...fakeTargets[0], last_touch: null }],
    })
  })

  it('returns 500 on DB error', async () => {
    mockFrom.mockReturnValueOnce({ select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'DB down' } }) }) })

    await GET(makeRequest('test-secret-123') as any)

    expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch targets' }, { status: 500 })
  })
})
