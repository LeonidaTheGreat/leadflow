/**
 * @jest-environment node
 *
 * Tests for page view logging (FR-3: agent_page_views table population).
 * Task: fix-page-view-logging-not-implemented-agent-page-views
 */

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// ---- Supabase mock ----
const mockInsert = jest.fn()
const mockFrom = jest.fn(() => ({ insert: mockInsert }))

jest.mock('@/lib/db', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}))

jest.mock('@/lib/supabase-server', () => ({
  isSupabaseConfigured: jest.fn(() => true),
}))

// ---- Import after mocks ----
const { POST, isTrackedPage } = require('@/app/api/page-views/route')

const JWT_SECRET = 'your-secret-key-change-in-production'
const AGENT_ID = '703b59fe-e16c-4dc6-8afa-a802db8c33d4'
const SESSION_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

function makeToken(payload: Record<string, unknown> = {}): string {
  return jwt.sign(
    { userId: AGENT_ID, email: 'test@example.com', sessionId: SESSION_ID, ...payload },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function makeRequest(body: Record<string, unknown>, token?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  return new NextRequest('http://localhost/api/page-views', {
    method: 'POST',
    headers,
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
  })

  it('inserts a page view and returns logged:true on success', async () => {
    mockInsert.mockResolvedValue({ error: null })
    const req = makeRequest({ page: '/dashboard' }, makeToken())
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.logged).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('agent_page_views')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: AGENT_ID, session_id: SESSION_ID, page: '/dashboard' })
    )
  })

  it('returns 401 when no token', async () => {
    const req = makeRequest({ page: '/dashboard' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for invalid JWT', async () => {
    const req = makeRequest({ page: '/dashboard' }, 'bad-token')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when page missing', async () => {
    const req = makeRequest({}, makeToken())
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for untracked page', async () => {
    const req = makeRequest({ page: '/login' }, makeToken())
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns logged:false when Supabase fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'FK violation', code: '23503' } })
    const req = makeRequest({ page: '/dashboard' }, makeToken())
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.logged).toBe(false)
  })

  it('returns logged:false when no session_id', async () => {
    const tokenNoSession = jwt.sign({ userId: AGENT_ID, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' })
    const req = makeRequest({ page: '/dashboard' }, tokenNoSession)
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.logged).toBe(false)
    expect(json.reason).toBe('no_session_id')
  })

  it('uses bodySessionId when JWT lacks sessionId', async () => {
    mockInsert.mockResolvedValue({ error: null })
    const tokenNoSession = jwt.sign({ userId: AGENT_ID, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' })
    const req = makeRequest({ page: '/dashboard', sessionId: SESSION_ID }, tokenNoSession)
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.logged).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ session_id: SESSION_ID }))
  })
})
