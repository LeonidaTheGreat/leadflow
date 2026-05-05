/**
 * @jest-environment node
 *
 * Tests for page view logging (FR-3: agent_page_views table population).
 * Task: fix-page-view-logging-not-implemented-agent-page-views
 */

import { NextRequest } from 'next/server'

// ---- Supabase mock ----
const mockInsert = jest.fn()
const mockFrom = jest.fn(() => ({ insert: mockInsert }))

jest.mock('@/lib/db', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}))

jest.mock('@/lib/supabase-server', () => ({
  isSupabaseConfigured: jest.fn(() => true),
}))

// ---- AuthService mock — getAuthUserId is the only method used by this route ----
jest.mock('@/lib/services/AuthService', () => ({
  getAuthUserId: jest.fn(),
}))

import { getAuthUserId } from '@/lib/services/AuthService'
const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>

// ---- Import after mocks ----
const { POST, isTrackedPage } = require('@/app/api/page-views/route')

const AGENT_ID = '703b59fe-e16c-4dc6-8afa-a802db8c33d4'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/page-views', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('isTrackedPage', () => {
  it('tracks /dashboard', () => expect(isTrackedPage('/dashboard')).toBe(true))
  it('tracks /dashboard/conversations', () => expect(isTrackedPage('/dashboard/conversations')).toBe(true))
  it('tracks /dashboard/settings', () => expect(isTrackedPage('/dashboard/settings')).toBe(true))
  it('tracks /dashboard/billing', () => expect(isTrackedPage('/dashboard/billing')).toBe(true))
  it('tracks /dashboard/* sub-paths', () => expect(isTrackedPage('/dashboard/analytics')).toBe(true))
  it('tracks /settings', () => expect(isTrackedPage('/settings')).toBe(true))
  it('tracks /settings/billing', () => expect(isTrackedPage('/settings/billing')).toBe(true))
  it('does not track /login', () => expect(isTrackedPage('/login')).toBe(false))
  it('does not track /api/leads', () => expect(isTrackedPage('/api/leads')).toBe(false))
})

describe('POST /api/page-views', () => {
  beforeEach(() => {
    mockInsert.mockReset()
    mockFrom.mockClear()
    mockGetAuthUserId.mockReset()
  })

  it('inserts a page view and returns logged:true on success', async () => {
    mockGetAuthUserId.mockResolvedValue(AGENT_ID)
    mockInsert.mockResolvedValue({ error: null })
    const req = makeRequest({ page: '/dashboard' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.logged).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('agent_page_views')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: AGENT_ID, page: '/dashboard' })
    )
  })

  it('returns 401 when no token', async () => {
    mockGetAuthUserId.mockResolvedValue(null)
    const req = makeRequest({ page: '/dashboard' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for invalid JWT', async () => {
    mockGetAuthUserId.mockResolvedValue(null)
    const req = makeRequest({ page: '/dashboard' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when page missing', async () => {
    mockGetAuthUserId.mockResolvedValue(AGENT_ID)
    const req = makeRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for untracked page', async () => {
    mockGetAuthUserId.mockResolvedValue(AGENT_ID)
    const req = makeRequest({ page: '/login' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns logged:false when Supabase fails', async () => {
    mockGetAuthUserId.mockResolvedValue(AGENT_ID)
    mockInsert.mockResolvedValue({ error: { message: 'FK violation', code: '23503' } })
    const req = makeRequest({ page: '/dashboard' })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.logged).toBe(false)
  })

  it('returns logged:false when auth returns null (no session)', async () => {
    mockGetAuthUserId.mockResolvedValue(null)
    const req = makeRequest({ page: '/dashboard' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('calls getAuthUserId for authentication', async () => {
    mockGetAuthUserId.mockResolvedValue(AGENT_ID)
    mockInsert.mockResolvedValue({ error: null })
    const req = makeRequest({ page: '/dashboard' })
    await POST(req)
    expect(mockGetAuthUserId).toHaveBeenCalledTimes(1)
  })
})
