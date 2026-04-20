/**
 * @jest-environment node
 */

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

const mockTargetsChain = {
  select: jest.fn(),
  order: jest.fn(),
  in: jest.fn(),
}

const mockFrom = jest.fn()

jest.mock('@/lib/db', () => ({
  postgrestAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn() },
}))

import { GET } from '../app/api/admin/outreach/targets/route'
import { NextRequest } from 'next/server'

function makeRequest(token?: string): NextRequest {
  return {
    headers: { get: (k: string) => (k === 'x-admin-token' ? token ?? null : null) },
  } as unknown as NextRequest
}

const TARGETS = [
  { id: 't1', name: 'Alice', email: 'alice@ex.com', location: 'NYC', brokerage: 'ABC', status: 'identified', created_at: '2026-01-01T00:00:00' },
  { id: 't2', name: 'Bob', email: 'bob@ex.com', location: null, brokerage: null, status: 'contacted', created_at: '2026-01-02T00:00:00' },
]

const TOUCHPOINTS = [
  { target_id: 't2', sent_at: '2026-04-01T10:00:00' },
  { target_id: 't2', sent_at: '2026-03-01T10:00:00' },
]

describe('GET /api/admin/outreach/targets', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...OLD_ENV, ADMIN_SECRET: 'test-secret' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('returns 401 with no token', async () => {
    const res = await GET(makeRequest())
    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 })
  })

  it('returns 401 with wrong token', async () => {
    const res = await GET(makeRequest('wrong'))
    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 })
  })

  it('returns 401 when ADMIN_SECRET not configured', async () => {
    delete process.env.ADMIN_SECRET
    const res = await GET(makeRequest('any-token'))
    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 })
  })

  it('returns enriched targets with last_touch when authenticated', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'pilot_recruitment_targets') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: TARGETS, error: null }),
          }),
        }
      }
      if (table === 'pilot_recruitment_touchpoints') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: TOUCHPOINTS, error: null }),
            }),
          }),
        }
      }
    })

    await GET(makeRequest('test-secret'))

    const call = mockJson.mock.calls[0]
    const { targets } = call[0] as { targets: any[] }

    expect(targets).toHaveLength(2)
    // t1 has no touchpoints
    expect(targets.find((t: any) => t.id === 't1').last_touch).toBeNull()
    // t2 has touchpoints; last_touch should be the most recent (first in DESC order)
    expect(targets.find((t: any) => t.id === 't2').last_touch).toBe('2026-04-01T10:00:00')
  })

  it('returns 500 on DB error', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }),
      }),
    })

    await GET(makeRequest('test-secret'))
    expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch targets' }, { status: 500 })
  })

  it('returns empty targets array when table is empty', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    await GET(makeRequest('test-secret'))
    const call = mockJson.mock.calls[0]
    expect((call[0] as any).targets).toEqual([])
  })
})
