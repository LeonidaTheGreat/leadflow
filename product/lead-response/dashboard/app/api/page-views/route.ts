/**
 * POST /api/page-views
 *
 * Logs a page view to the agent_page_views table.
 * FR-3: Each dashboard navigation creates a row in agent_page_views.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db'
import { isSupabaseConfigured } from '@/lib/supabase-server'
import { getAuthUserId } from '@/lib/auth'

const DB_URL = process.env.NEXT_PUBLIC_API_URL || ''
const DB_KEY = process.env.API_SECRET_KEY || ''

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

    const { page } = body

    if (!page || typeof page !== 'string') {
      return NextResponse.json({ error: 'page is required' }, { status: 400 })
    }

    if (!isTrackedPage(page)) {
      return NextResponse.json({ error: 'Page not tracked' }, { status: 400 })
    }

    // Unified auth: checks auth-token (JWT) and leadflow_session (session DB)
    const agentId = await getAuthUserId(request)
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(DB_URL, DB_KEY)

    // agent_page_views has no session_id or visited_at columns; use created_at (auto-set) instead
    const insertPayload: Record<string, string> = {
      agent_id: agentId,
      page,
    }

    const { error } = await supabase.from('agent_page_views').insert(insertPayload)

    if (error) {
      console.error('[page-views] Insert failed:', error.message, { agentId, page, code: error.code })
      return NextResponse.json({ logged: false, reason: error.code }, { status: 200 })
    }

    return NextResponse.json({ logged: true }, { status: 200 })
  } catch (err) {
    console.error('[page-views] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
