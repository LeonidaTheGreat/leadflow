/**
 * POST /api/page-views
 *
 * Logs a page view to the agent_page_views table.
 * FR-3: Each dashboard navigation creates a row in agent_page_views.
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createClient } from '@/lib/db'
import { isSupabaseConfigured } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { isTrackedPage } from '@/lib/page-tracking'

const DB_URL = process.env.NEXT_PUBLIC_API_URL || ''
const DB_KEY = process.env.API_SECRET_KEY || ''
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

function extractAuthInfo(request: NextRequest): { agentId: string | null; sessionId: string | null } {
  // Check Authorization: Bearer header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any
      const agentId = payload.userId || payload.id || null
      const sessionId = payload.sessionId || null
      return { agentId, sessionId }
    } catch {
      return { agentId: null, sessionId: null }
    }
  }

  // Check cookies
  const cookieToken = request.cookies.get('auth-token')?.value || request.cookies.get('auth_token')?.value
  if (cookieToken) {
    try {
      const payload = jwt.verify(cookieToken, JWT_SECRET) as any
      const agentId = payload.userId || payload.id || null
      const sessionId = payload.sessionId || null
      return { agentId, sessionId }
    } catch {
      return { agentId: null, sessionId: null }
    }
  }

  return { agentId: null, sessionId: null }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
    }

    let body: { page?: string; sessionId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { page, sessionId: bodySessionId } = body

    if (!page || typeof page !== 'string') {
      return NextResponse.json({ error: 'page is required' }, { status: 400 })
    }

    if (!isTrackedPage(page)) {
      return NextResponse.json({ error: 'Page not tracked' }, { status: 400 })
    }

    const { agentId, sessionId: jwtSessionId } = extractAuthInfo(request)
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prefer sessionId from JWT, fall back to body
    const sessionId = jwtSessionId || bodySessionId || null

    if (!sessionId) {
      return NextResponse.json({ logged: false, reason: 'no_session_id' }, { status: 200 })
    }

    const supabase = createClient(DB_URL, DB_KEY)

    const insertPayload: Record<string, string> = {
      agent_id: agentId,
      session_id: sessionId,
      page }

    const { error } = await supabase.from('agent_page_views').insert(insertPayload)

    if (error) {
      logger.error(`[page-views] Insert failed: ${error.message}`, { agentId, page, code: error.code })
      return NextResponse.json({ logged: false, reason: error.code }, { status: 200 })
    }

    return NextResponse.json({ logged: true }, { status: 200 })
  } catch (err) {
    logger.error('[page-views] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
