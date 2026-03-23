/**
 * GET /api/satisfaction/events
 * Returns individual satisfaction events for an agent (last 30 days, paginated)
 * 
 * Query params:
 *   agentId (required)
 *   limit (optional, default 50)
 *   offset (optional, default 0)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: events, error, count } = await supabaseAdmin
      .from('lead_satisfaction_events')
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId)
      .not('rating', 'is', null)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ Error fetching satisfaction events:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('❌ /api/satisfaction/events error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
