/**
 * POST /api/page-views
 *
 * Logs a page view to the agent_page_views table.
 * FR-3: Each dashboard navigation creates a row in agent_page_views.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { isSupabaseConfigured } from '@/lib/supabase-server'

const DB_URL = process.env.NEXT_PUBLIC_API_URL || ''
const DB_KEY = process.env.API_SECRET_KEY || ''
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export function isTrackedPage(pathname: string): boolean {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return true
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return true
  return false
}

export const TRACKED_PAGES = [
  '/dashboard',
  '/dashboard/conversations',
  '/dashboard/settings',
  '/dashboard/billing',
  '/settings',
  '/settings/billing',
]

interface JwtPayload {
  userId: string
  email: string
  sessionId?: string
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  return request.cookies.get('leadflow_token')?.value ?? null
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

    const token = extractToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload: JwtPayload
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const agentId = payload.userId
    const sessionId = payload.sessionId ?? bodySessionId ?? null

    if (!agentId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 })
    }

    if (!sessionId) {
      return NextResponse.json({ logged: false, reason: 'no_session_id' }, { status: 200 })
    }

const supabase = supabaseAdmin
